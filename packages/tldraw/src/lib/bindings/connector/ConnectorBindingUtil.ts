import {
	BindingOnChangeOptions,
	BindingOnCreateOptions,
	BindingOnShapeChangeOptions,
	BindingOnShapeIsolateOptions,
	BindingUtil,
	ConnectorBinding,
	ConnectorShape,
	Editor,
	TLArrowBindingProps,
	TLParentId,
	TLShape,
	TLShapeId,
	TLShapePartial,
	Vec,
	approximately,
	arrowBindingMigrations,
	arrowBindingProps,
	assert,
	intersectLineSegmentCircle,
} from '@tldraw/editor'
import { getArrowBindings, getArrowInfo, removeArrowBinding } from '../../shapes/connector/shared'

/**
 * @public
 */
export class ConnectorBindingUtil extends BindingUtil<ConnectorBinding> {
	static override type = 'connector'

	static override props = arrowBindingProps
	static override migrations = arrowBindingMigrations

	override getDefaultProps(): Partial<TLArrowBindingProps> {
		return {
			isPrecise: false,
			isExact: false,
			normalizedAnchor: { x: 0.5, y: 0.5 },
		}
	}

	// when the binding itself changes
	override onAfterCreate({ binding }: BindingOnCreateOptions<ConnectorBinding>): void {
		const arrow = this.editor.getShape(binding.fromId) as ConnectorShape | undefined
		if (!arrow) return
		arrowDidUpdate(this.editor, arrow)
	}

	// when the binding itself changes
	override onAfterChange({ bindingAfter }: BindingOnChangeOptions<ConnectorBinding>): void {
		const arrow = this.editor.getShape(bindingAfter.fromId) as ConnectorShape | undefined
		if (!arrow) return
		arrowDidUpdate(this.editor, arrow)
	}

	// when the arrow itself changes
	override onAfterChangeFromShape({
		shapeAfter,
	}: BindingOnShapeChangeOptions<ConnectorBinding>): void {
		arrowDidUpdate(this.editor, shapeAfter as ConnectorShape)
	}

	// when the shape an arrow is bound to changes
	override onAfterChangeToShape({ binding }: BindingOnShapeChangeOptions<ConnectorBinding>): void {
		reparentArrow(this.editor, binding.fromId)
	}

	// when the arrow is isolated we need to update it's x,y positions
	override onBeforeIsolateFromShape({
		binding,
	}: BindingOnShapeIsolateOptions<ConnectorBinding>): void {
		const arrow = this.editor.getShape<ConnectorShape>(binding.fromId)
		if (!arrow) return
		updateArrowTerminal({
			editor: this.editor,
			arrow,
			terminal: binding.props.terminal,
		})
	}
}

function reparentArrow(editor: Editor, arrowId: TLShapeId) {
	const arrow = editor.getShape<ConnectorShape>(arrowId)
	if (!arrow) return
	const bindings = getArrowBindings(editor, arrow)
	const { start, end } = bindings
	const startShape = start ? editor.getShape(start.toId) : undefined
	const endShape = end ? editor.getShape(end.toId) : undefined

	const parentPageId = editor.getAncestorPageId(arrow)
	if (!parentPageId) return

	let nextParentId: TLParentId
	if (startShape && endShape) {
		// if arrow has two bindings, always parent arrow to closest common ancestor of the bindings
		nextParentId = editor.findCommonAncestor([startShape, endShape]) ?? parentPageId
	} else if (startShape || endShape) {
		const bindingParentId = (startShape || endShape)?.parentId
		// If the arrow and the shape that it is bound to have the same parent, then keep that parent
		if (bindingParentId && bindingParentId === arrow.parentId) {
			nextParentId = arrow.parentId
		} else {
			// if arrow has one binding, keep arrow on its own page
			nextParentId = parentPageId
		}
	} else {
		return
	}

	if (nextParentId && nextParentId !== arrow.parentId) {
		editor.reparentShapes([arrowId], nextParentId)
	}

	const reparentedArrow = editor.getShape<ConnectorShape>(arrowId)
	if (!reparentedArrow) throw Error('no reparented arrow')

	const startSibling = editor.getShapeNearestSibling(reparentedArrow, startShape)
	const endSibling = editor.getShapeNearestSibling(reparentedArrow, endShape)

	let highestSibling: TLShape | undefined

	if (startSibling && endSibling) {
		highestSibling = startSibling.index < endSibling.index ? startSibling : endSibling
	} else if (startSibling && !endSibling) {
		highestSibling = startSibling
	} else if (endSibling && !startSibling) {
		highestSibling = endSibling
	} else {
		return
	}

	// Get all siblings and find the lowest index
	const allSiblings = editor
		.getSortedChildIdsForParent(highestSibling.parentId)
		.map((id) => editor.getShape(id)!)

	// Place connector at the lowest possible index
	const finalIndex = allSiblings[0].index

	if (finalIndex !== reparentedArrow.index) {
		editor.updateShapes<ConnectorShape>([{ id: arrowId, type: 'connector', index: finalIndex }])
	}
}

function arrowDidUpdate(editor: Editor, arrow: ConnectorShape) {
	const bindings = getArrowBindings(editor, arrow)
	// if the shape is an arrow and its bound shape is on another page
	// or was deleted, unbind it
	for (const handle of ['start', 'end'] as const) {
		const binding = bindings[handle]
		if (!binding) continue
		const boundShape = editor.getShape(binding.toId)
		const isShapeInSamePageAsArrow =
			editor.getAncestorPageId(arrow) === editor.getAncestorPageId(boundShape)
		if (!boundShape || !isShapeInSamePageAsArrow) {
			updateArrowTerminal({ editor, arrow, terminal: handle, unbind: true })
		}
	}

	// always check the arrow parents
	reparentArrow(editor, arrow.id)
}

/** @internal */
export function updateArrowTerminal({
	editor,
	arrow,
	terminal,
	unbind = false,
	useHandle = false,
}: {
	editor: Editor
	arrow: ConnectorShape
	terminal: 'start' | 'end'
	unbind?: boolean
	useHandle?: boolean
}) {
	const info = getArrowInfo(editor, arrow)
	if (!info) {
		throw new Error('expected arrow info')
	}

	const startPoint = useHandle ? info.start.handle : info.start.point
	const endPoint = useHandle ? info.end.handle : info.end.point
	const point = terminal === 'start' ? startPoint : endPoint

	const update = {
		id: arrow.id,
		type: 'connector',
		props: {
			[terminal]: { x: point.x, y: point.y },
			bend: arrow.props.bend,
		},
	} satisfies TLShapePartial<ConnectorShape>

	// fix up the bend:
	if (!info.isStraight) {
		// find the new start/end points of the resulting arrow
		const newStart = terminal === 'start' ? startPoint : info.start.handle
		const newEnd = terminal === 'end' ? endPoint : info.end.handle
		const newMidPoint = Vec.Med(newStart, newEnd)

		// intersect a line segment perpendicular to the new arrow with the old arrow arc to
		// find the new mid-point
		const lineSegment = Vec.Sub(newStart, newEnd)
			.per()
			.uni()
			.mul(info.handleArc.radius * 2 * Math.sign(arrow.props.bend))

		// find the intersections with the old arrow arc:
		const intersections = intersectLineSegmentCircle(
			info.handleArc.center,
			Vec.Add(newMidPoint, lineSegment),
			info.handleArc.center,
			info.handleArc.radius
		)

		assert(intersections?.length === 1)
		const bend = Vec.Dist(newMidPoint, intersections[0]) * Math.sign(arrow.props.bend)
		// use `approximately` to avoid endless update loops
		if (!approximately(bend, update.props.bend)) {
			update.props.bend = bend
		}
	}

	editor.updateShape(update)
	if (unbind) {
		removeArrowBinding(editor, arrow, terminal)
	}
}
