import { CubicBezier2d, Geometry2d, ShapeUtil, TLBaseShape, Vec } from 'tldraw'

export type CodeBlockConnectorShape = TLBaseShape<
	'connector',
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
	static override type = 'connector'

	getDefaultProps(): CodeBlockConnectorShape['props'] {
		return {
			start: { x: 0, y: 0 },
			end: { x: 0, y: 0 },
			color: 'red',
		}
	}

	getGeometry(shape: CodeBlockConnectorShape): Geometry2d {
		console.log('Recalculating geometry for:', shape)
		const { start, end } = shape.props

		const controlPoint1 = new Vec(start.x, start.y + Math.abs(end.y - start.y) / 3)
		const controlPoint2 = new Vec(end.x, end.y - Math.abs(end.y - start.y) / 3)

		return new CubicBezier2d({
			start: Vec.From(start),
			cp1: controlPoint1,
			cp2: controlPoint2,
			end: Vec.From(end),
		})
	}

	component(shape: CodeBlockConnectorShape) {
		function bezierToSVGPath(start: Vec, cp1: Vec, cp2: Vec, end: Vec): string {
			return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`
		}

		const bezier = this.getGeometry(shape) as CubicBezier2d
		const path = bezierToSVGPath(bezier.a, bezier.b, bezier.c, bezier.d)

		return (
			<svg width="100%" height="100%" style={{ overflow: 'visible' }}>
				<path d={path} fill="none" stroke={'black'} strokeWidth={2} strokeLinecap="round" />
			</svg>
		)
	}

	indicator(shape: CodeBlockConnectorShape) {
		return <></>
	}
}
