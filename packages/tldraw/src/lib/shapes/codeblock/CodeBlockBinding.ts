import {
	BindingOnShapeChangeOptions,
	BindingOnShapeDeleteOptions,
	BindingUtil,
	T,
	TLBaseBinding,
	lerp,
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

		const shapeBounds = this.editor.getShapeGeometry(shapeAfter)!.bounds
		console.log(shapeBounds)
		const newAnchorPoint = {
			x: lerp(shapeBounds.minX, shapeBounds.maxX, binding.props.normalizedAnchor.x),
			y: lerp(shapeBounds.minY, shapeBounds.maxY, binding.props.normalizedAnchor.y),
		}

		const pageAnchor = this.editor.getShapePageTransform(shapeAfter).applyToPoint(newAnchorPoint)
		const parentAnchor = this.editor
			.getShapeParentTransform(connector)
			.invert()
			.applyToPoint(pageAnchor)

		console.log('parentAnchor', parentAnchor)

		if (this.editor.getSelectedShapeIds().includes(connector.id)) {
			return
		} else {
			this.editor.updateShape({
				id: connector.id,
				type: 'connector',
				props: {
					...connector.props,
					start: {
						x: parentAnchor.x,
						y: parentAnchor.y,
					},
				},
			})
		}
	}

	override onBeforeDeleteToShape({ binding }: BindingOnShapeDeleteOptions<ConnectorBinding>): void {
		this.editor.deleteShape(binding.fromId)
	}
}
