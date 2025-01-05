import {
	CodeBlockShapeUtil,
	CodeBlockTool,
	ConnectorShape,
	IndexKey,
	Tldraw,
	codeBlockUiOverrides,
	components,
	createShapeId,
	useEditor,
} from 'tldraw'

import { useEffect } from 'react'
import { ConnectorBindingUtil } from 'tldraw/src/lib/bindings/connector/ConnectorBindingUtil'
import { ConnectorShapeUtil } from 'tldraw/src/lib/shapes/connector/ConnectorShapeUtil'
import { ConnectorTool } from 'tldraw/src/lib/tools/ConnectorTool/ConnectorTool'
// import {
// 	CodeBlockConnectorShape,
// 	CodeBlockConnectorUtil,
// } from 'tldraw/src/lib/shapes/codeblock/CodeBlockConnectorShape'

import { customAssetUrls2 } from 'tldraw/src/lib/ui/custom/code-block-ui'

const customTools = [CodeBlockTool, ConnectorTool]
const shapeUtils = [CodeBlockShapeUtil, ConnectorShapeUtil]
const bindingUtils = [ConnectorBindingUtil]

function ConnectableCanvas() {
	const editor = useEditor()
	// const [currentArrow, setCurrentArrow] = useState<CodeBlockConnectorShape | null>(null)

	const addConnector = (position: 'top' | 'bottom', shapeIdString: string) => {
		const connectordId = createShapeId('1231sd')

		const newConnector: ConnectorShape = {
			id: connectordId,
			type: 'connector',
			x: 0,
			y: 0,
			rotation: 0,
			index: 'a1' as IndexKey,
			isLocked: false,
			opacity: 1,
			meta: {},
			typeName: 'shape',
			parentId: editor.getCurrentPageId(),
			props: {
				color: 'black',
				labelColor: 'black',
				fill: 'none',
				dash: 'draw',
				size: 'm',
				font: 'draw',
				text: '',
				arrowheadStart: 'none',
				arrowheadEnd: 'arrow',
				start: { x: 0, y: 0 },
				end: { x: 0, y: 0 },
				bend: 0,
				labelPosition: 0.5,
				scale: 1,
			},
		}
		editor.createShape(newConnector)
		// setCurrentArrow(newConnector)
		return [connectordId]
	}

	useEffect(() => {
		const handlePointerDown = (e: PointerEvent) => {
			const target = e.target as HTMLElement
			const handle = target.dataset.handle
			if (handle === 'top' || handle === 'bottom') {
				editor.setCurrentTool('connector')
			}
		}

		const container = editor.getContainer()
		// container.addEventListener('pointermove', handlePointerMove)
		container.addEventListener('pointerdown', handlePointerDown)
		// container.addEventListener('pointerup', handlePointerUp)

		return () => {
			// container.removeEventListener('pointermove', handlePointerMove)
			container.removeEventListener('pointerdown', handlePointerDown)
			// container.removeEventListener('pointerup', handlePointerUp)
		}
	}, [editor])

	return null
}

export default function ConnectableExample() {
	return (
		<div style={{ width: '100vw', height: '100vh' }}>
			<Tldraw
				tools={customTools}
				shapeUtils={shapeUtils}
				bindingUtils={bindingUtils}
				overrides={codeBlockUiOverrides}
				components={components}
				assetUrls={customAssetUrls2}
				persistenceKey="connectable-example"
				inferDarkMode
			>
				<ConnectableCanvas />
			</Tldraw>
		</div>
	)
}
