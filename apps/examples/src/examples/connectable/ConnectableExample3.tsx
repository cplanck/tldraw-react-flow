import {
	CodeBlockShapeUtil,
	CodeBlockTool,
	ConnectableShapeUtil,
	ConnectableTool,
	Tldraw,
	codeBlockUiOverrides,
	components,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
// import { customAssetUrls } from './connectable-ui'
// import { customAssetUrls } from './ui/custom/code-block-ui'
import { customAssetUrls2 } from 'tldraw/src/lib/ui/custom/code-block-ui'

const customTools = [ConnectableTool, CodeBlockTool]
const shapeUtils = [ConnectableShapeUtil, CodeBlockShapeUtil]

function InsideOfContext() {
	const editor = useEditor()
	// your editor code here
	console.log(editor)
	return null // or whatever
}
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
			>
				<InsideOfContext />
			</Tldraw>
		</div>
	)
}
