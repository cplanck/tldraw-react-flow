import {
	Box,
	ConnectorBinding,
	ConnectorShape,
	ConnectorShapeProps,
	CubicBezier2d,
	Editor,
	Geometry2d,
	Group2d,
	JsonObject,
	Rectangle2d,
	SVGContainer,
	ShapeUtil,
	SvgExportContext,
	TLHandle,
	TLHandleDragInfo,
	TLResizeInfo,
	TLShapeId,
	TLShapePartial,
	TLShapeUtilCanBindOpts,
	TLShapeUtilCanvasSvgDef,
	Vec,
	WeakCache,
	arrowShapeProps,
	getDefaultColorTheme,
	getPerfectDashProps,
	lerp,
	maybeSnapToGrid,
	structuredClone,
	toDomPrecision,
	track,
	useEditor,
	useSharedSafeId,
	useValue,
} from '@tldraw/editor'

// import { Path2D } from 'tldraw';

import React from 'react'

import { SvgTextLabel } from '../shared/SvgTextLabel'
import { TextLabel } from '../shared/TextLabel'
import { ARROW_LABEL_PADDING, STROKE_SIZES, TEXT_PROPS } from '../shared/default-shape-constants'
import {
	getFillDefForCanvas,
	getFillDefForExport,
	getFontDefForExport,
} from '../shared/defaultStyleDefs'
import { useDefaultColorTheme } from '../shared/useDefaultColorTheme'
import { getArrowLabelFontSize, getArrowLabelPosition } from './arrowLabel'
import { getArrowheadPathForType } from './arrowheads'
import {
	ConnectorBindings,
	createOrUpdateArrowBinding,
	getArrowBindings,
	getArrowInfo,
	getArrowTerminalsInArrowSpace,
	removeArrowBinding,
} from './shared'

import './styles.css'

enum ARROW_HANDLES {
	START = 'start',
	MIDDLE = 'middle',
	END = 'end',
}

/** @alpha */
export class ConnectorShapeUtil extends ShapeUtil<ConnectorShape> {
	static override type = 'connector' as const
	static override props = arrowShapeProps
	// static override migrations = arrowShapeMigrations

	override canEdit() {
		return true
	}

	override canBind({ toShapeType }: TLShapeUtilCanBindOpts<ConnectorShape>): boolean {
		// bindings can go from arrows to shapes, but not from shapes to arrows
		return toShapeType !== 'connector'
	}
	override canSnap() {
		return false
	}
	override hideResizeHandles() {
		return true
	}
	override hideRotateHandle() {
		return true
	}
	override hideSelectionBoundsBg() {
		return true
	}
	override hideSelectionBoundsFg() {
		return true
	}

	override canBeLaidOut(shape: ConnectorShape) {
		const bindings = getArrowBindings(this.editor, shape)
		return !bindings.start && !bindings.end
	}

	override getDefaultProps(): ConnectorShape['props'] {
		return {
			dash: 'draw',
			size: 'l',
			fill: 'none',
			color: 'red',
			labelColor: 'red',
			bend: 0,
			start: { x: 0, y: 0 },
			end: { x: 2, y: 0 },
			arrowheadStart: 'none',
			arrowheadEnd: 'arrow',
			text: '',
			labelPosition: 0.5,
			font: 'draw',
			scale: 1,
		}
	}

	getGeometry(shape: ConnectorShape) {
		const info = getArrowInfo(this.editor, shape)!
		const splineInfo = getSplinePath(shape, this.editor)
		console.log(splineInfo)
		console.log(info)

		const debugGeom: Geometry2d[] = []

		// Create the main geometry using the spline path directly
		const [start, c1, c2, end] = splineInfo.path
			.replace('M ', '')
			.replace(' C ', ',')
			.split(',')
			.map((str) => {
				const [x, y] = str.trim().split(' ').map(Number)
				return Vec.From({ x, y })
			})

		const bodyGeom = new CubicBezier2d({
			start,
			cp1: c1,
			cp2: c2,
			end,
		})

		// Handle text label if present
		let labelGeom
		if (shape.props.text.trim()) {
			const labelPosition = getArrowLabelPosition(this.editor, shape)
			debugGeom.push(...labelPosition.debugGeom)
			labelGeom = new Rectangle2d({
				x: labelPosition.box.x,
				y: labelPosition.box.y,
				width: labelPosition.box.w,
				height: labelPosition.box.h,
				isFilled: true,
				isLabel: true,
			})
		}

		// Return a group containing both the spline geometry and any labels
		return new Group2d({
			children: [...(labelGeom ? [bodyGeom, labelGeom] : [bodyGeom]), ...debugGeom],
		})
	}

	override getHandles(shape: ConnectorShape): TLHandle[] {
		const info = getArrowInfo(this.editor, shape)!

		return [
			{
				id: ARROW_HANDLES.START,
				type: 'vertex',
				index: 'a0',
				x: info.start.handle.x,
				y: info.start.handle.y,
			},
			{
				id: ARROW_HANDLES.END,
				type: 'vertex',
				index: 'a3',
				x: info.end.handle.x,
				y: info.end.handle.y,
			},
		].filter(Boolean) as TLHandle[]
	}

	override getText(shape: ConnectorShape) {
		return shape.props.text
	}

	override onHandleDrag(
		shape: ConnectorShape,
		{ handle, isPrecise }: TLHandleDragInfo<ConnectorShape>
	) {
		const handleId = handle.id as ARROW_HANDLES
		const bindings = getArrowBindings(this.editor, shape)

		if (handleId === ARROW_HANDLES.MIDDLE) {
			// Bending the arrow...
			const { start, end } = getArrowTerminalsInArrowSpace(this.editor, shape, bindings)

			const delta = Vec.Sub(end, start)
			const v = Vec.Per(delta)

			const med = Vec.Med(end, start)
			const A = Vec.Sub(med, v)
			const B = Vec.Add(med, v)

			const point = Vec.NearestPointOnLineSegment(A, B, handle, false)
			let bend = Vec.Dist(point, med)
			if (Vec.Clockwise(point, end, med)) bend *= -1
			return { id: shape.id, type: shape.type, props: { bend } }
		}

		// Start or end, pointing the arrow...

		const update: TLShapePartial<ConnectorShape> = { id: shape.id, type: 'connector', props: {} }

		const currentBinding = bindings[handleId]

		const otherHandleId = handleId === ARROW_HANDLES.START ? ARROW_HANDLES.END : ARROW_HANDLES.START
		const otherBinding = bindings[otherHandleId]

		if (this.editor.inputs.ctrlKey) {
			// todo: maybe double check that this isn't equal to the other handle too?
			// Skip binding
			removeArrowBinding(this.editor, shape, handleId)

			update.props![handleId] = {
				x: handle.x,
				y: handle.y,
			}
			return update
		}

		const point = this.editor.getShapePageTransform(shape.id)!.applyToPoint(handle)

		const target = this.editor.getShapeAtPoint(point, {
			hitInside: true,
			hitFrameInside: true,
			margin: 0,
			filter: (targetShape) => {
				return (
					!targetShape.isLocked &&
					this.editor.canBindShapes({ fromShape: shape, toShape: targetShape, binding: 'arrow' })
				)
			},
		})

		if (!target) {
			// todo: maybe double check that this isn't equal to the other handle too?
			removeArrowBinding(this.editor, shape, handleId)
			const newPoint = maybeSnapToGrid(new Vec(handle.x, handle.y), this.editor)
			update.props![handleId] = {
				x: newPoint.x,
				y: newPoint.y,
			}
			return update
		}

		// we've got a target! the handle is being dragged over a shape, bind to it

		const targetGeometry = this.editor.getShapeGeometry(target)
		const targetBounds = Box.ZeroFix(targetGeometry.bounds)
		const pageTransform = this.editor.getShapePageTransform(update.id)!
		const pointInPageSpace = pageTransform.applyToPoint(handle)
		const pointInTargetSpace = this.editor.getPointInShapeSpace(target, pointInPageSpace)

		let precise = isPrecise

		if (!precise) {
			// If we're switching to a new bound shape, then precise only if moving slowly
			if (!currentBinding || (currentBinding && target.id !== currentBinding.toId)) {
				precise = this.editor.inputs.pointerVelocity.len() < 0.5
			}
		}

		if (!isPrecise) {
			if (!targetGeometry.isClosed) {
				precise = true
			}

			// Double check that we're not going to be doing an imprecise snap on
			// the same shape twice, as this would result in a zero length line
			if (otherBinding && target.id === otherBinding.toId && otherBinding.props.isPrecise) {
				precise = true
			}
		}

		const normalizedAnchor = {
			x: (pointInTargetSpace.x - targetBounds.minX + 0.5) / targetBounds.width,
			y: (pointInTargetSpace.y - targetBounds.minY + 0.5) / targetBounds.height,
		}

		if (precise) {
			// Turn off precision if we're within a certain distance to the center of the shape.
			// Funky math but we want the snap distance to be 4 at the minimum and either
			// 16 or 15% of the smaller dimension of the target shape, whichever is smaller
			if (
				Vec.Dist(pointInTargetSpace, targetBounds.center) <
				Math.max(4, Math.min(Math.min(targetBounds.width, targetBounds.height) * 0.15, 16)) /
					this.editor.getZoomLevel()
			) {
				normalizedAnchor.x = 0.5
				normalizedAnchor.y = 0.5
			}
		}

		const b = {
			terminal: handleId,
			normalizedAnchor,
			isPrecise: precise,
			isExact: this.editor.inputs.altKey,
		}

		createOrUpdateArrowBinding(this.editor, shape, target.id, b)

		this.editor.setHintingShapes([target.id])

		const newBindings = getArrowBindings(this.editor, shape)
		if (newBindings.start && newBindings.end && newBindings.start.toId === newBindings.end.toId) {
			if (
				Vec.Equals(newBindings.start.props.normalizedAnchor, newBindings.end.props.normalizedAnchor)
			) {
				createOrUpdateArrowBinding(this.editor, shape, newBindings.end.toId, {
					...newBindings.end.props,
					normalizedAnchor: {
						x: newBindings.end.props.normalizedAnchor.x + 0.05,
						y: newBindings.end.props.normalizedAnchor.y,
					},
				})
			}
		}

		return update
	}

	// override onTranslateStart(shape: ConnectorShape) {
	// 	const bindings = getArrowBindings(this.editor, shape)

	// 	const terminalsInArrowSpace = getArrowTerminalsInArrowSpace(this.editor, shape, bindings)
	// 	const shapePageTransform = this.editor.getShapePageTransform(shape.id)!

	// 	// If at least one bound shape is in the selection, do nothing;
	// 	// If no bound shapes are in the selection, unbind any bound shapes

	// 	const selectedShapeIds = this.editor.getSelectedShapeIds()

	// 	if (
	// 		(bindings.start &&
	// 			(selectedShapeIds.includes(bindings.start.toId) ||
	// 				this.editor.isAncestorSelected(bindings.start.toId))) ||
	// 		(bindings.end &&
	// 			(selectedShapeIds.includes(bindings.end.toId) ||
	// 				this.editor.isAncestorSelected(bindings.end.toId)))
	// 	) {
	// 		return
	// 	}

	// 	// When we start translating shapes, record where their bindings were in page space so we
	// 	// can maintain them as we translate the arrow
	// 	shapeAtTranslationStart.set(shape, {
	// 		pagePosition: shapePageTransform.applyToPoint(shape),
	// 		terminalBindings: mapObjectMapValues(terminalsInArrowSpace, (terminalName, point) => {
	// 			const binding = bindings[terminalName]
	// 			if (!binding) return null
	// 			return {
	// 				binding,
	// 				shapePosition: point,
	// 				pagePosition: shapePageTransform.applyToPoint(point),
	// 			}
	// 		}),
	// 	})

	// 	// update arrow terminal bindings eagerly to make sure the arrows unbind nicely when translating
	// 	if (bindings.start) {
	// 		updateArrowTerminal({
	// 			editor: this.editor,
	// 			arrow: shape,
	// 			terminal: 'start',
	// 			useHandle: true,
	// 		})
	// 		shape = this.editor.getShape(shape.id) as ConnectorShape
	// 	}
	// 	if (bindings.end) {
	// 		updateArrowTerminal({
	// 			editor: this.editor,
	// 			arrow: shape,
	// 			terminal: 'end',
	// 			useHandle: true,
	// 		})
	// 	}

	// 	for (const handleName of [ARROW_HANDLES.START, ARROW_HANDLES.END] as const) {
	// 		const binding = bindings[handleName]
	// 		if (!binding) continue

	// 		this.editor.updateBinding({
	// 			...binding,
	// 			props: { ...binding.props, isPrecise: true },
	// 		})
	// 	}

	// 	return
	// }

	override onTranslateStart(
		shape: ConnectorShape
	):
		| void
		| ({
				id: TLShapeId
				type: 'connector'
				props?: Partial<ConnectorShapeProps> | undefined
				meta?: Partial<JsonObject> | undefined
		  } & Partial<Omit<ConnectorShape, 'type' | 'id' | 'props' | 'meta'>>) {
		// prevent user from moving the connector
		return undefined
	}

	override onTranslate(initialShape: ConnectorShape, shape: ConnectorShape) {
		const atTranslationStart = shapeAtTranslationStart.get(initialShape)
		if (!atTranslationStart) return

		const shapePageTransform = this.editor.getShapePageTransform(shape.id)!
		const pageDelta = Vec.Sub(
			shapePageTransform.applyToPoint(shape),
			atTranslationStart.pagePosition
		)

		for (const terminalBinding of Object.values(atTranslationStart.terminalBindings)) {
			if (!terminalBinding) continue

			const newPagePoint = Vec.Add(terminalBinding.pagePosition, Vec.Mul(pageDelta, 0.5))
			const newTarget = this.editor.getShapeAtPoint(newPagePoint, {
				hitInside: true,
				hitFrameInside: true,
				margin: 0,
				filter: (targetShape) => {
					return (
						!targetShape.isLocked &&
						this.editor.canBindShapes({ fromShape: shape, toShape: targetShape, binding: 'arrow' })
					)
				},
			})

			if (newTarget?.id === terminalBinding.binding.toId) {
				const targetBounds = Box.ZeroFix(this.editor.getShapeGeometry(newTarget).bounds)
				const pointInTargetSpace = this.editor.getPointInShapeSpace(newTarget, newPagePoint)
				const normalizedAnchor = {
					x: (pointInTargetSpace.x - targetBounds.minX) / targetBounds.width,
					y: (pointInTargetSpace.y - targetBounds.minY) / targetBounds.height,
				}
				createOrUpdateArrowBinding(this.editor, shape, newTarget.id, {
					...terminalBinding.binding.props,
					normalizedAnchor,
					isPrecise: true,
				})
			} else {
				removeArrowBinding(this.editor, shape, terminalBinding.binding.props.terminal)
			}
		}
	}

	private readonly _resizeInitialBindings = new WeakCache<ConnectorShape, ConnectorBindings>()

	override onResize(shape: ConnectorShape, info: TLResizeInfo<ConnectorShape>) {
		const { scaleX, scaleY } = info

		const bindings = this._resizeInitialBindings.get(shape, () =>
			getArrowBindings(this.editor, shape)
		)
		const terminals = getArrowTerminalsInArrowSpace(this.editor, shape, bindings)

		const { start, end } = structuredClone<ConnectorShape['props']>(shape.props)
		let { bend } = shape.props

		// Rescale start handle if it's not bound to a shape
		if (!bindings.start) {
			start.x = terminals.start.x * scaleX
			start.y = terminals.start.y * scaleY
		}

		// Rescale end handle if it's not bound to a shape
		if (!bindings.end) {
			end.x = terminals.end.x * scaleX
			end.y = terminals.end.y * scaleY
		}

		// todo: we should only change the normalized anchor positions
		// of the shape's handles if the bound shape is also being resized

		const mx = Math.abs(scaleX)
		const my = Math.abs(scaleY)

		const startNormalizedAnchor = bindings?.start
			? Vec.From(bindings.start.props.normalizedAnchor)
			: null
		const endNormalizedAnchor = bindings?.end ? Vec.From(bindings.end.props.normalizedAnchor) : null

		if (scaleX < 0 && scaleY >= 0) {
			if (bend !== 0) {
				bend *= -1
				bend *= Math.max(mx, my)
			}

			if (startNormalizedAnchor) {
				startNormalizedAnchor.x = 1 - startNormalizedAnchor.x
			}

			if (endNormalizedAnchor) {
				endNormalizedAnchor.x = 1 - endNormalizedAnchor.x
			}
		} else if (scaleX >= 0 && scaleY < 0) {
			if (bend !== 0) {
				bend *= -1
				bend *= Math.max(mx, my)
			}

			if (startNormalizedAnchor) {
				startNormalizedAnchor.y = 1 - startNormalizedAnchor.y
			}

			if (endNormalizedAnchor) {
				endNormalizedAnchor.y = 1 - endNormalizedAnchor.y
			}
		} else if (scaleX >= 0 && scaleY >= 0) {
			if (bend !== 0) {
				bend *= Math.max(mx, my)
			}
		} else if (scaleX < 0 && scaleY < 0) {
			if (bend !== 0) {
				bend *= Math.max(mx, my)
			}

			if (startNormalizedAnchor) {
				startNormalizedAnchor.x = 1 - startNormalizedAnchor.x
				startNormalizedAnchor.y = 1 - startNormalizedAnchor.y
			}

			if (endNormalizedAnchor) {
				endNormalizedAnchor.x = 1 - endNormalizedAnchor.x
				endNormalizedAnchor.y = 1 - endNormalizedAnchor.y
			}
		}

		if (bindings.start && startNormalizedAnchor) {
			createOrUpdateArrowBinding(this.editor, shape, bindings.start.toId, {
				...bindings.start.props,
				normalizedAnchor: startNormalizedAnchor.toJson(),
			})
		}
		if (bindings.end && endNormalizedAnchor) {
			createOrUpdateArrowBinding(this.editor, shape, bindings.end.toId, {
				...bindings.end.props,
				normalizedAnchor: endNormalizedAnchor.toJson(),
			})
		}

		const next = {
			props: {
				start,
				end,
				bend,
			},
		}

		return next
	}

	override onDoubleClickHandle(
		shape: ConnectorShape,
		handle: TLHandle
	): TLShapePartial<ConnectorShape> | void {
		switch (handle.id) {
			case ARROW_HANDLES.START: {
				return {
					id: shape.id,
					type: shape.type,
					props: {
						...shape.props,
						arrowheadStart: shape.props.arrowheadStart === 'none' ? 'arrow' : 'none',
					},
				}
			}
			case ARROW_HANDLES.END: {
				return {
					id: shape.id,
					type: shape.type,
					props: {
						...shape.props,
						arrowheadEnd: shape.props.arrowheadEnd === 'none' ? 'arrow' : 'none',
					},
				}
			}
		}
	}

	component(shape: ConnectorShape) {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const theme = useDefaultColorTheme()
		const onlySelectedShape = this.editor.getOnlySelectedShape()
		const shouldDisplayHandles =
			this.editor.isInAny(
				'select.idle',
				'select.pointing_handle',
				'select.dragging_handle',
				'select.translating',
				'arrow.dragging'
			) && !this.editor.getIsReadonly()

		const info = getArrowInfo(this.editor, shape)
		if (!info?.isValid) return null

		const labelPosition = getArrowLabelPosition(this.editor, shape)
		const isSelected = shape.id === this.editor.getOnlySelectedShapeId()
		const isEditing = this.editor.getEditingShapeId() === shape.id
		const showArrowLabel = isEditing || shape.props.text

		return (
			<>
				<SVGContainer style={{ minWidth: 50, minHeight: 50 }}>
					<ArrowSvg
						shape={shape}
						shouldDisplayHandles={shouldDisplayHandles && onlySelectedShape?.id === shape.id}
					/>
				</SVGContainer>
				{showArrowLabel && (
					<TextLabel
						shapeId={shape.id}
						classNamePrefix="tl-arrow"
						type="arrow"
						font={shape.props.font}
						fontSize={getArrowLabelFontSize(shape)}
						lineHeight={TEXT_PROPS.lineHeight}
						align="middle"
						verticalAlign="middle"
						text={shape.props.text}
						labelColor={theme[shape.props.labelColor].solid}
						textWidth={labelPosition.box.w - ARROW_LABEL_PADDING * 2 * shape.props.scale}
						isSelected={isSelected}
						padding={0}
						style={{
							transform: `translate(${labelPosition.box.center.x}px, ${labelPosition.box.center.y}px)`,
						}}
					/>
				)}
			</>
		)
	}

	override indicator(shape: ConnectorShape) {
		const editor = this.editor
		const splineInfo = getSplinePath(shape, editor)

		// Return null if start and end are the same point
		if (Vec.Equals(splineInfo.start, splineInfo.end)) return null

		return (
			<g>
				{/* Create a transparent path for hover detection */}
				<path
					d={splineInfo.path} // Use the spline path for the indicator
					fill="none"
					strokeWidth={0.5}
					stroke={'blue'}
					opacity={0.5} // Adjust opacity as needed
					pointerEvents="all" // Ensure it captures pointer events
				/>
				{/* Optionally, you can add a visual indicator here */}
				<path
					d={splineInfo.path}
					fill="none"
					strokeWidth={1}
					stroke={'blue'}
					opacity={0.5} // Adjust opacity as needed
				/>
			</g>
		)
	}

	override onEditEnd(shape: ConnectorShape) {
		const {
			id,
			type,
			props: { text },
		} = shape

		if (text.trimEnd() !== shape.props.text) {
			this.editor.updateShapes<ConnectorShape>([
				{
					id,
					type,
					props: {
						text: text.trimEnd(),
					},
				},
			])
		}
	}

	override toSvg(shape: ConnectorShape, ctx: SvgExportContext) {
		ctx.addExportDef(getFillDefForExport(shape.props.fill))
		if (shape.props.text) ctx.addExportDef(getFontDefForExport(shape.props.font))
		const theme = getDefaultColorTheme(ctx)
		const scaleFactor = 1 / shape.props.scale

		return (
			<g transform={`scale(${scaleFactor})`}>
				<ArrowSvg shape={shape} shouldDisplayHandles={false} />
				<SvgTextLabel
					fontSize={getArrowLabelFontSize(shape)}
					font={shape.props.font}
					align="middle"
					verticalAlign="middle"
					text={shape.props.text}
					labelColor={theme[shape.props.labelColor].solid}
					bounds={getArrowLabelPosition(this.editor, shape)
						.box.clone()
						.expandBy(-ARROW_LABEL_PADDING * shape.props.scale)}
					padding={0}
				/>
			</g>
		)
	}

	override getCanvasSvgDefs(): TLShapeUtilCanvasSvgDef[] {
		return [
			getFillDefForCanvas(),
			{
				key: `arrow:dot`,
				component: ArrowheadDotDef,
			},
			{
				key: `arrow:cross`,
				component: ArrowheadCrossDef,
			},
		]
	}
	override getInterpolatedProps(
		startShape: ConnectorShape,
		endShape: ConnectorShape,
		progress: number
	): ConnectorShapeProps {
		return {
			...(progress > 0.5 ? endShape.props : startShape.props),
			scale: lerp(startShape.props.scale, endShape.props.scale, progress),
			start: {
				x: lerp(startShape.props.start.x, endShape.props.start.x, progress),
				y: lerp(startShape.props.start.y, endShape.props.start.y, progress),
			},
			end: {
				x: lerp(startShape.props.end.x, endShape.props.end.x, progress),
				y: lerp(startShape.props.end.y, endShape.props.end.y, progress),
			},
			bend: lerp(startShape.props.bend, endShape.props.bend, progress),
			labelPosition: lerp(startShape.props.labelPosition, endShape.props.labelPosition, progress),
		}
	}
}

export function getArrowLength(editor: Editor, shape: ConnectorShape): number {
	const info = getArrowInfo(editor, shape)!

	return info.isStraight
		? Vec.Dist(info.start.handle, info.end.handle)
		: Math.abs(info.handleArc.length)
}

function getSplinePath(shape: ConnectorShape, editor: Editor) {
	const bindings = getArrowBindings(editor, shape)

	// Get the actual terminal points including bound shape edges
	const terminals = getArrowTerminalsInArrowSpace(editor, shape, bindings)
	const start = terminals.start
	const end = terminals.end

	const dx = end.x - start.x
	const dy = end.y - start.y
	const distance = Math.sqrt(dx * dx + dy * dy)

	const offset = distance * 0.25

	let cp1x, cp1y, cp2x, cp2y

	// Use normalized anchors from bindings
	const startBinding = bindings?.start
	const endBinding = bindings?.end

	const isStartVertical =
		startBinding?.props?.normalizedAnchor?.y === 0 || startBinding?.props?.normalizedAnchor?.y === 1
	const isEndVertical =
		endBinding?.props?.normalizedAnchor?.y === 0 || endBinding?.props?.normalizedAnchor?.y === 1

	// Set control points based on connection sides
	if (isStartVertical && startBinding?.props?.normalizedAnchor?.y === 1) {
		cp1x = start.x
		cp1y = start.y + (dy > 0 ? offset : offset)
	} else if (isStartVertical && startBinding?.props?.normalizedAnchor?.y === 0) {
		cp1x = start.x
		cp1y = start.y + (dy > 0 ? -offset : -offset)
	} else {
		cp1x = start.x + (dx > 0 ? offset : -offset)
		cp1y = start.y
	}

	if (isEndVertical && endBinding?.props?.normalizedAnchor?.y === 1) {
		cp2x = end.x
		cp2y = end.y + (dy > 0 ? offset : offset)
	} else if (isEndVertical && endBinding?.props?.normalizedAnchor?.y === 0) {
		cp2x = end.x
		cp2y = end.y + (dy > 0 ? -offset : -offset)
	} else {
		cp2x = end.x + (dx > 0 ? -offset : offset)
		cp2y = end.y
	}

	return {
		path: `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`,
		start,
		end,
	}
}

const ArrowSvg = track(function ArrowSvg({
	shape,
	shouldDisplayHandles,
}: {
	shape: ConnectorShape
	shouldDisplayHandles: boolean
}) {
	const editor = useEditor()
	const theme = useDefaultColorTheme()

	const bounds = Box.ZeroFix(editor.getShapeGeometry(shape).bounds)
	const bindings = getArrowBindings(editor, shape)
	const info = getArrowInfo(editor, shape)

	const splineInfo = getSplinePath(shape, editor)
	const [start, c1, c2, end] = splineInfo.path
		.replace('M ', '')
		.replace(' C ', ',')
		.split(',')
		.map((str) => {
			const [x, y] = str.trim().split(' ').map(Number)
			return Vec.From({ x, y })
		})

	const bodyGeom = new CubicBezier2d({
		start,
		cp1: c1,
		cp2: c2,
		end,
	})

	const isForceSolid = useValue(
		'force solid',
		() => {
			return editor.getZoomLevel() < 0.2
		},
		[editor]
	)

	const clipPathId = useSharedSafeId(shape.id + '_clip')
	const arrowheadDotId = useSharedSafeId('arrowhead-dot')
	const arrowheadCrossId = useSharedSafeId('arrowhead-cross')

	const strokeWidth = STROKE_SIZES[shape.props.size] * shape.props.scale

	const as = info?.start.arrowhead && getArrowheadPathForType(info, 'start', strokeWidth)
	const ae = info?.end.arrowhead && getArrowheadPathForType(info, 'end', strokeWidth)

	let handlePath: null | React.JSX.Element = null

	if (shouldDisplayHandles) {
		const sw = 2 / editor.getZoomLevel()
		const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
			getArrowLength(editor, shape),
			sw,
			{
				end: 'skip',
				start: 'skip',
				lengthRatio: 2.5,
			}
		)

		handlePath =
			bindings.start || bindings.end ? (
				<path
					className="tl-arrow-hint"
					d={splineInfo.path}
					strokeDasharray={strokeDasharray}
					strokeDashoffset={strokeDashoffset}
					strokeWidth={sw}
					markerStart={
						bindings.start
							? bindings.start.props.isExact
								? ''
								: bindings.start.props.isPrecise
									? `url(#${arrowheadCrossId})`
									: `url(#${arrowheadDotId})`
							: ''
					}
					markerEnd={
						bindings.end
							? bindings.end.props.isExact
								? ''
								: bindings.end.props.isPrecise
									? `url(#${arrowheadCrossId})`
									: `url(#${arrowheadDotId})`
							: ''
					}
					opacity={0.16}
				/>
			) : null
	}

	const labelPosition = getArrowLabelPosition(editor, shape)

	const clipStartArrowhead = 'none' // !(info.start.arrowhead === 'none' || info.start.arrowhead === 'arrow')
	const clipEndArrowhead = 'none' // !(info.end.arrowhead === 'none' || info.end.arrowhead === 'arrow')

	return (
		<>
			<defs>
				<clipPath id={clipPathId}>
					<ArrowClipPath
						hasText={shape.props.text.trim().length > 0}
						bounds={bounds}
						labelBounds={labelPosition.box}
						as={clipStartArrowhead && as ? as : ''}
						ae={clipEndArrowhead && ae ? ae : ''}
					/>
				</clipPath>
			</defs>
			<g
				fill="none"
				stroke={theme[shape.props.color].solid}
				// strokeWidth={strokeWidth}
				strokeLinejoin="round"
				strokeLinecap="round"
				pointerEvents="none"
			>
				{handlePath}
				<g>
					<rect
						x={toDomPrecision(bounds.minX - 100)}
						y={toDomPrecision(bounds.minY - 100)}
						width={toDomPrecision(bounds.width + 200)}
						height={toDomPrecision(bounds.height + 200)}
						opacity={0}
					/>
					<path
						d={splineInfo.path}
						// strokeDasharray={strokeDasharray}
						strokeDasharray="5 8"
						// strokeDashoffset={strokeDashoffset}
						className="animated-dashed-line"
					/>
				</g>
				{/* {as && clipStartArrowhead && shape.props.fill !== 'none' && (
					<ShapeFill
						theme={theme}
						d={as}
						color={shape.props.color}
						fill={shape.props.fill}
						scale={shape.props.scale}
					/>
				)}
				{ae && clipEndArrowhead && shape.props.fill !== 'none' && (
					<ShapeFill
						theme={theme}
						d={ae}
						color={shape.props.color}
						fill={shape.props.fill}
						scale={shape.props.scale}
					/>
				)}
				{as && <path d={as} />}
				{ae && <path d={ae} />} */}
			</g>
		</>
	)
})

function ArrowClipPath({
	hasText,
	bounds,
	labelBounds,
	as,
	ae,
}: {
	hasText: boolean
	bounds: Box
	labelBounds: Box
	as: string
	ae: string
}) {
	// The direction in which we create the different path parts is important, as it determines what gets clipped.
	// See the description on the directions in the non-zero fill rule example:
	// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/fill-rule#nonzero
	// We create this one in the clockwise direction
	const boundingBoxPath = `M${toDomPrecision(bounds.minX - 100)},${toDomPrecision(bounds.minY - 100)} h${bounds.width + 200} v${bounds.height + 200} h-${bounds.width + 200} Z`
	// We create this one in the counter-clockwise direction, which cuts out the label box
	const labelBoxPath = `M${toDomPrecision(labelBounds.minX)},${toDomPrecision(labelBounds.minY)} v${labelBounds.height} h${labelBounds.width} v-${labelBounds.height} Z`
	// We also append the arrowhead paths to the clip path, so that we also clip the arrowheads
	return <path d={`${boundingBoxPath}${hasText ? labelBoxPath : ''}${as}${ae}`} />
}

const shapeAtTranslationStart = new WeakMap<
	ConnectorShape,
	{
		pagePosition: Vec
		terminalBindings: Record<
			'start' | 'end',
			{
				pagePosition: Vec
				shapePosition: Vec
				binding: ConnectorBinding
			} | null
		>
	}
>()

function ArrowheadDotDef() {
	const id = useSharedSafeId('arrowhead-dot')
	return (
		<marker id={id} className="tl-arrow-hint" refX="3.0" refY="3.0" orient="0">
			<circle cx="3" cy="3" r="2" strokeDasharray="100%" />
		</marker>
	)
}

function ArrowheadCrossDef() {
	const id = useSharedSafeId('arrowhead-cross')
	return (
		<marker id={id} className="tl-arrow-hint" refX="3.0" refY="3.0" orient="auto">
			<line x1="1.5" y1="1.5" x2="4.5" y2="4.5" strokeDasharray="100%" />
			<line x1="1.5" y1="4.5" x2="4.5" y2="1.5" strokeDasharray="100%" />
		</marker>
	)
}
