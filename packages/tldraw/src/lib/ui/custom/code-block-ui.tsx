import {
	DefaultToolbar,
	DefaultToolbarContent,
	TLComponents,
	TLUiAssetUrlOverrides,
	TLUiOverrides,
	TLUiToolItem,
	TldrawUiMenuItem,
	useIsToolSelected,
	useTools,
} from '../../..'

export const customAssetUrls2: TLUiAssetUrlOverrides = {
	icons: {
		'code-block-icon': '/code-block-icon.svg',
		'connectable-icon': '/connectable-icon.svg',
	},
}

/**
 * @alpha
 */
export const codeBlockUiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		const codeBlockTool: TLUiToolItem = {
			id: 'codeBlock',
			icon: 'code-block-icon',
			label: 'Code Block Node',
			kbd: 'n',
			readonlyOk: false,
			onSelect: () => {
				editor.setCurrentTool('codeBlock')
			},
		}
		tools.codeBlock = codeBlockTool

		const connectableTool: TLUiToolItem = {
			id: 'connectable',
			icon: 'connectable-icon',
			label: 'Connectable Node',
			kbd: 'm',
			readonlyOk: false,
			onSelect: () => {
				editor.setCurrentTool('connectable')
			},
		}
		tools.connectable = connectableTool

		return tools
	},
}

/**
 * @alpha
 */
export const components: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		const isCodeBlockSelected = useIsToolSelected(tools['codeBlock'])
		const isConnectableSelected = useIsToolSelected(tools['connectable'])

		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools['codeBlock']} isSelected={isCodeBlockSelected} />
				<TldrawUiMenuItem {...tools['connectable']} isSelected={isConnectableSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
}
