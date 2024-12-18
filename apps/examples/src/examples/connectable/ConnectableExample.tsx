import { useEffect, useState } from 'react'
import {
	CodeBlockShapeUtil,
	CodeBlockTool,
	ConnectableShapeUtil,
	ConnectableTool,
	IndexKey,
	Tldraw,
	codeBlockUiOverrides,
	components,
	createShapeId,
	useEditor,
} from 'tldraw'
import { CodeBlockConnectorShape } from 'tldraw/src/lib/shapes/codeblock/CodeBlockConnectorShape'
import { CodeBlockShape } from 'tldraw/src/lib/shapes/codeblock/CodeBlockShape'
import { customAssetUrls2 } from 'tldraw/src/lib/ui/custom/code-block-ui'
import { v4 as uuidv4 } from 'uuid'
const customTools = [ConnectableTool, CodeBlockTool]
const shapeUtils = [ConnectableShapeUtil, CodeBlockShapeUtil]

function ConnectableCanvas() {
	const editor = useEditor()
	const [currentArrow, setCurrentArrow] = useState<CodeBlockConnectorShape | null>(null)

	const addConnector = (position: 'top' | 'bottom', shapeIdString: string) => {
		const shapeId = createShapeId(shapeIdString)
		const shape: CodeBlockShape | undefined = editor.getShape(shapeId)
		if (shape) {
			const shapeX = shape.x
			const shapeY = shape.y
			const pointerX = editor.inputs.currentPagePoint.x
			const pointerY = editor.inputs.currentPagePoint.y

			const newConnector: CodeBlockConnectorShape = {
				id: createShapeId(uuidv4()),
				type: 'arrow',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as IndexKey,
				parentId: shape.parentId,
				isLocked: false,
				opacity: 1,
				meta: {},
				typeName: 'shape',
				props: {
					start: {
						x: shapeX + shape.props.w / 2,
						y: position === 'top' ? shapeY : shapeY + shape.props.h,
					},
					end: {
						x: pointerX,
						y: pointerY,
					},
					color: 'black',
				},
			}
			editor.createShape(newConnector)
			setCurrentArrow(newConnector)
		}
	}

	useEffect(() => {
		const handlePointerMove = (e: PointerEvent) => {
			console.log(
				'EDITOR PAGE POINTS',
				editor.inputs.currentPagePoint.x,
				editor.inputs.currentPagePoint.y
			)
			console.log('EVENT POINTS', e.clientX, e.clientY)

			if (currentArrow) {
				const newEnd = {
					x: editor.inputs.currentPagePoint.x,
					y: editor.inputs.currentPagePoint.y,
				}

				editor.updateShape({
					...currentArrow,
					props: {
						...currentArrow.props,
						end: newEnd,
					},
				})
			}
		}

		const handlePointerDown = (e: PointerEvent) => {
			const target = e.target as HTMLElement
			const handle = target.dataset.handle

			if (handle === 'top' || handle === 'bottom') {
				editor.selectNone()
				e.stopPropagation()
				e.preventDefault()

				if (currentArrow) {
					setCurrentArrow(null)
					const newEnd = {
						x: editor.inputs.currentPagePoint.x,
						y: editor.inputs.currentPagePoint.y,
					}

					// Update the current arrow's end position
					editor.updateShape({
						...currentArrow,
						props: {
							...currentArrow.props,
							end: newEnd,
						},
					})
				} else {
					// Start creating a new connector
					addConnector(handle, target.id.split(':')[1])
				}
			} else {
				setCurrentArrow(null)
			}
		}

		const container = editor.getContainer()
		container.addEventListener('pointermove', handlePointerMove)
		container.addEventListener('pointerdown', handlePointerDown)
		// container.addEventListener('pointerup', handlePointerUp)

		return () => {
			container.removeEventListener('pointermove', handlePointerMove)
			container.removeEventListener('pointerdown', handlePointerDown)
			// container.removeEventListener('pointerup', handlePointerUp)
		}
	}, [editor, currentArrow])

	return null
}

export default function ConnectableExample() {
	return (
		<div style={{ width: '100vw', height: '100vh' }}>
			<Tldraw
				tools={customTools}
				shapeUtils={shapeUtils}
				overrides={codeBlockUiOverrides}
				components={components}
				assetUrls={customAssetUrls2}
				// inferDarkMode
			>
				<ConnectableCanvas />
			</Tldraw>
		</div>
	)
}
