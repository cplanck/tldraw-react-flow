import {
	CodeBlockShapeUtil,
	CodeBlockTool,
	ConnectableShapeUtil,
	ConnectableTool,
	Tldraw,
	codeBlockUiOverrides,
	components,
} from 'tldraw'
import 'tldraw/tldraw.css'
// import { customAssetUrls } from './connectable-ui'
// import { customAssetUrls } from './ui/custom/code-block-ui'
import { customAssetUrls2 } from 'tldraw/src/lib/ui/custom/code-block-ui'

const customTools = [ConnectableTool, CodeBlockTool]
const shapeUtils = [ConnectableShapeUtil, CodeBlockShapeUtil]

export default function ConnectableExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				tools={customTools}
				shapeUtils={shapeUtils}
				overrides={codeBlockUiOverrides}
				components={components}
				assetUrls={customAssetUrls2}
				inferDarkMode
			/>
		</div>
	)
}
