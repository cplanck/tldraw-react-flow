// packages/tldraw/src/lib/shapes/connectable/ConnectableShape.tsx
import {
	BaseBoxShapeUtil,
	HTMLContainer,
	T,
	TLBaseShape,
	getDefaultColorTheme,
} from '@tldraw/editor'

/**
 * @alpha
 */
export type ConnectableShape = TLBaseShape<
	'connectable',
	{
		w: number
		h: number
		color: string
		text: string
	}
>

/**
 * @alpha
 */
export class ConnectableShapeUtil extends BaseBoxShapeUtil<ConnectableShape> {
	static override type = 'connectable' as const

	static override props = {
		w: T.number,
		h: T.number,
		color: T.string,
		text: T.string,
	}

	getDefaultProps(): ConnectableShape['props'] {
		return {
			w: 200,
			h: 100,
			color: 'light-blue',
			text: 'Connectable Node',
		}
	}

	component(shape: ConnectableShape) {
		const theme = getDefaultColorTheme({ isDarkMode: true })

		return (
			<HTMLContainer
				id={shape.id}
				style={{
					border: '2px solid black',
					borderRadius: '4px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: shape.props.color,
					color: theme.text,
				}}
			>
				{shape.props.text}
			</HTMLContainer>
		)
	}

	indicator(shape: ConnectableShape) {
		return <rect width={shape.props.w} height={shape.props.h} rx={4} ry={4} />
	}
}
