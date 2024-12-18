import { StateNode, createShapeId } from '@tldraw/editor'

/**
 * @alpha
 */
export class CodeBlockTool extends StateNode {
	static override id = 'codeBlock'
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
			type: 'codeBlock',
			x: currentPagePoint.x - 100,
			y: currentPagePoint.y - 50,
			props: {
				text: 'New Code Block',
			},
		})

		this.editor.select(id)
		this.editor.setCurrentTool('select')
	}
}
