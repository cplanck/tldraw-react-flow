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
		'connector-icon': '/connector-icon.svg',
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

		const connectorTool: TLUiToolItem = {
			id: 'connector',
			icon: 'connector-icon',
			label: 'Code Block Connector',
			kbd: 'c',
			readonlyOk: false,
			onSelect: () => {
				editor.setCurrentTool('connector')
			},
		}
		tools.connector = connectorTool

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
		const isConnectorSelected = useIsToolSelected(tools['connector'])

		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools['codeBlock']} isSelected={isCodeBlockSelected} />
				<TldrawUiMenuItem {...tools['connector']} isSelected={isConnectorSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
}
