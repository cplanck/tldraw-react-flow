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
export type CodeBlockShape = TLBaseShape<
	'codeBlock',
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
export class CodeBlockShapeUtil extends BaseBoxShapeUtil<CodeBlockShape> {
	static override type = 'codeBlock' as const

	static override props = {
		w: T.number,
		h: T.number,
		color: T.string,
		text: T.string,
	}

	getDefaultProps(): CodeBlockShape['props'] {
		return {
			w: 200,
			h: 100,
			color: 'light-blue',
			text: 'Code Block Node',
		}
	}

	component(shape: CodeBlockShape) {
		const theme = getDefaultColorTheme({ isDarkMode: false })

		return (
			<HTMLContainer
				id={shape.id}
				style={{
					border: '2px solid black',
					borderRadius: '4px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					// backgroundColor: shape.props.color,
					backgroundColor: 'white',
					color: theme.text,
				}}
			>
				{shape.props.text}
			</HTMLContainer>
		)
	}

	indicator(shape: CodeBlockShape) {
		return <rect width={shape.props.w} height={shape.props.h} rx={4} ry={4} />
	}
}
