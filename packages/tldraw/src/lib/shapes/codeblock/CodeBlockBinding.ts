import {
	BindingOnShapeChangeOptions,
	BindingOnShapeDeleteOptions,
	BindingUtil,
	T,
	TLBaseBinding,
} from 'tldraw'

export interface ConnectorBinding extends TLBaseBinding<'connector', ConnectorBindingProps> {
	type: 'connector'
	props: {
		terminal: 'start' | 'end'
		isPrecise: boolean
		normalizedAnchor: { x: number; y: number }
	}
}

export type ConnectorBindingProps = {
	terminal: 'start' | 'end'
	isPrecise: boolean
	normalizedAnchor: { x: number; y: number }
}

export class ConnectorBindingUtil extends BindingUtil<ConnectorBinding> {
	static override type = 'connector'

	static override props = {
		terminal: T.string,
		isPrecise: T.boolean,
		normalizedAnchor: T.object({
			x: T.number,
			y: T.number,
		}),
	}

	getDefaultProps() {
		return {
			terminal: 'start' as const,
			isPrecise: true,
			// normalizedAnchor: { x: 0.5, y: 0.5 },
		}
	}

	override onAfterChangeToShape({
		binding,
		shapeAfter,
	}: BindingOnShapeChangeOptions<ConnectorBinding>): void {
		const connector = this.editor.getShape(binding.fromId)!
		const shapeBounds = this.editor.getShapeGeometry(shapeAfter).bounds

		// Calculate new connection point based on normalized anchor
		const newPoint = {
			x: shapeBounds.minX + shapeBounds.width * binding.props.normalizedAnchor.x,
			y: shapeBounds.minY + shapeBounds.height * binding.props.normalizedAnchor.y,
		}

		// Transform point to connector's coordinate space
		const pagePoint = this.editor.getShapePageTransform(shapeAfter).applyToPoint(newPoint)
		const localPoint = this.editor
			.getShapeParentTransform(connector)
			.invert()
			.applyToPoint(pagePoint)

		// Update the appropriate end of the connector with a serializable point
		this.editor.updateShape({
			id: connector.id,
			type: 'connector',
			props: {
				...connector.props,
				[binding.props.terminal]: { x: localPoint.x, y: localPoint.y },
			},
		})
	}

	override onBeforeDeleteToShape({ binding }: BindingOnShapeDeleteOptions<ConnectorBinding>): void {
		this.editor.deleteShape(binding.fromId)
	}
}
