import { Polygon2d, ShapeUtil, T, TLBaseShape, Vec } from '@tldraw/editor'

export type CodeBlockConnectorShape = TLBaseShape<
	'arrow',
	{
		start: { x: number; y: number }
		end: { x: number; y: number }
		color: string
	}
>
/**
 * @alpha
 */
export class CodeBlockConnectorUtil extends ShapeUtil<CodeBlockConnectorShape> {
	static override type = 'arrow'

	static override props = {
		start: T.number,
		end: T.number,
		color: T.string,
		strokeWidth: T.number,
	}

	getDefaultProps(): CodeBlockConnectorShape['props'] {
		return {
			start: { x: 0, y: 0 },
			end: { x: 0, y: 0 },
			color: 'black',
		}
	}

	getGeometry(shape: CodeBlockConnectorShape) {
		const { start, end } = shape.props

		const geometry = new Polygon2d({
			points: [new Vec(start.x, start.y), new Vec(end.x, end.y)],
			isFilled: false,
		})

		return geometry
	}

	component(shape: CodeBlockConnectorShape) {
		return (
			// <line
			//   x1={shape.props.start.x}
			//   y1={shape.props.start.y}
			//   x2={shape.props.end.x}
			//   y2={shape.props.end.y}
			//   stroke={shape.props.color}
			//   markerEnd="url(#arrowhead)"
			// />
			<></>
		)
	}

	indicator(shape: CodeBlockConnectorShape) {
		return (
			// <line
			//   x1={shape.props.start.x}
			//   y1={shape.props.start.y}
			//   x2={shape.props.end.x}
			//   y2={shape.props.end.y}
			//   stroke="blue"
			//   strokeWidth={1}
			//   strokeDasharray="5,5"
			// />
			<></>
		)
	}
}
