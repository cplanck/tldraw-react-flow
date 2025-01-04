import { BaseBoxShapeUtil, HTMLContainer, T, TLBaseShape } from '@tldraw/editor'

/**
 * @alpha
 */
export type CodeBlockShape = TLBaseShape<
	'codeBlock',
	{
		w: number
		h: number
		text: string
	}
>
/**
 * @alpha
 */
export class CodeBlockShapeUtil extends BaseBoxShapeUtil<CodeBlockShape> {
	static override type = 'codeBlock'

	static override props = {
		w: T.number,
		h: T.number,
		text: T.string,
	}

	getDefaultProps(): CodeBlockShape['props'] {
		return {
			w: 200,
			h: 100,
			text: 'Code Block',
		}
	}

	component(shape: CodeBlockShape) {
		return (
			<HTMLContainer
				style={{
					position: 'relative',
					width: shape.props.w,
					height: shape.props.h,
					border: '2px solid black',
					backgroundColor: 'white',
					borderRadius: '4px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					cursor: 'crosshair',
				}}
			>
				{shape.props.text}
				<div
					data-handle="top"
					id={`handle-top-${shape.id}`}
					style={{
						position: 'absolute',
						top: '-6px',
						left: '50%',
						transform: 'translateX(-50%)',
						width: '10px',
						height: '10px',
						backgroundColor: 'grey',
						borderRadius: '50%',
						pointerEvents: 'auto',
						cursor: 'crosshair',
					}}
				/>
				<div
					data-handle="bottom"
					id={`handle-bottom-${shape.id}`}
					style={{
						position: 'absolute',
						bottom: '-6px',
						left: '50%',
						transform: 'translateX(-50%)',
						width: '10px',
						height: '10px',
						backgroundColor: 'grey',
						borderRadius: '50%',
						pointerEvents: 'auto',
						cursor: 'crosshair',
					}}
				/>
			</HTMLContainer>
		)
	}

	indicator(shape: CodeBlockShape) {
		return (
			<rect
				width={shape.props.w}
				height={shape.props.h}
				rx={4}
				ry={4}
				stroke="blue"
				strokeWidth={0}
				fill="none"
			/>
		)
	}
}
