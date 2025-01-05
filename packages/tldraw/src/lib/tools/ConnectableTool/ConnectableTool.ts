import { StateNode, createShapeId } from '@tldraw/editor'

/**
 * @public
 */
export class ConnectableTool extends StateNode {
	static override id = 'connectable'
	static override initial = 'idle'
	static override children = () => []
	override shapeType = 'note'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown() {
		const { currentPagePoint } = this.editor.inputs

		const id = createShapeId()

		this.editor.createShape({
			id,
			type: 'note',
			x: currentPagePoint.x - 100,
			y: currentPagePoint.y - 50,
			props: {
				color: 'white',
				stroke: 'black',
				text: 'New Connectable Node',
			},
		})

		this.editor.select(id)
		this.editor.setCurrentTool('select')
	}
}
