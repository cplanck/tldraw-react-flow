// packages/tldraw/src/lib/ui/connectable/connectable-ui.ts
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

export const customAssetUrls: TLUiAssetUrlOverrides = {
	icons: {
		'connectable-icon': '/connectable-icon.svg',
	},
}

export const connectableUiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		const tool: TLUiToolItem = {
			id: 'connectable',
			icon: 'connectable-icon',
			label: 'Connectable Node',
			kbd: 'n',
			readonlyOk: false,
			onSelect: () => {
				editor.setCurrentTool('connectable')
			},
		}
		tools.connectable = tool
		return tools
	},
}

export const components: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		const isConnectableSelected = useIsToolSelected(tools['connectable'])
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools['connectable']} isSelected={isConnectableSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
}
