import { StateNode, createShapeId, maybeSnapToGrid } from '@tldraw/editor'

import { ConnectorShape } from '@tldraw/editor'

export class Pointing extends StateNode {
	static override id = 'pointing'

	shape?: ConnectorShape

	markId = ''

	override onEnter() {
		this.markId = ''
		this.didTimeout = false

		const target = this.editor.getShapeAtPoint(this.editor.inputs.currentPagePoint, {
			filter: (targetShape) => {
				return (
					!targetShape.isLocked &&
					this.editor.canBindShapes({
						fromShape: 'connector',
						toShape: targetShape,
						binding: 'connector',
					})
				)
			},
			margin: 0,
			hitInside: true,
			renderingOnly: true,
		})

		if (!target) {
			this.createArrowShape()
		} else {
			this.editor.setHintingShapes([target.id])
		}

		this.startPreciseTimeout()
	}

	override onExit() {
		this.shape = undefined
		this.editor.setHintingShapes([])
		this.clearPreciseTimeout()
	}

	override onPointerMove() {
		if (this.editor.inputs.isDragging) {
			if (!this.shape) {
				this.createArrowShape()
			}

			if (!this.shape) throw Error(`expected shape`)

			// const initialEndHandle = this.editor.getShapeHandles(this.shape)!.find((h) => h.id === 'end')!
			this.updateArrowShapeEndHandle()

			this.editor.setCurrentTool('select.dragging_handle', {
				shape: this.shape,
				handle: { id: 'end', type: 'vertex', index: 'a3', x: 0, y: 0 },
				isCreating: true,
				creatingMarkId: this.markId || undefined,
				onInteractionEnd: 'connector',
			})
		}
	}

	override onPointerUp() {
		this.cancel()
	}

	override onCancel() {
		this.cancel()
	}

	override onComplete() {
		this.cancel()
	}

	override onInterrupt() {
		this.cancel()
	}

	cancel() {
		if (this.shape) {
			// the arrow might not have been created yet!
			this.editor.bailToMark(this.markId)
		}
		this.editor.setHintingShapes([])
		this.parent.transition('idle')
	}

	createArrowShape() {
		console.log('createArrowShape')
		const { originPagePoint } = this.editor.inputs
		const id = createShapeId()

		this.markId = this.editor.markHistoryStoppingPoint(`creating_connector:${id}`)
		const newPoint = maybeSnapToGrid(originPagePoint, this.editor)

		// Create shape with simpler start/end coordinates
		this.editor.createShape({
			id,
			type: 'connector',
			x: newPoint.x,
			y: newPoint.y,
			props: {
				color: 'red',
				size: 's',
				arrowheadStart: 'none',
				arrowheadEnd: 'none',
				start: {
					x: 0,
					y: 0,
				},
				end: {
					x: 0,
					y: 0,
				},
			},
		})

		this.shape = this.editor.getShape(id)
		if (!this.shape) throw Error(`expected shape`)

		this.editor.select(id)
	}

	updateArrowShapeEndHandle() {
		if (!this.shape) return

		console.log('updateArrowShapeEndHandle')
		const point = this.editor.getPointInShapeSpace(this.shape, this.editor.inputs.currentPagePoint)

		this.editor.updateShape({
			id: this.shape.id,
			type: 'connector',
			props: {
				...this.shape.props,
				end: {
					x: point.x,
					y: point.y,
				},
			},
		})
	}

	private preciseTimeout = -1
	private didTimeout = false
	private startPreciseTimeout() {
		this.preciseTimeout = this.editor.timers.setTimeout(() => {
			if (!this.getIsActive()) return
			this.didTimeout = true
		}, 320)
	}
	private clearPreciseTimeout() {
		clearTimeout(this.preciseTimeout)
	}
}
