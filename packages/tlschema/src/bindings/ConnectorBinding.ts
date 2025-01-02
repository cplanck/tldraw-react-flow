import { T } from '@tldraw/validate'
import { VecModel, vecModelValidator } from '../misc/geometry-types'
import { createBindingPropsMigrationSequence } from '../records/TLBinding'
import { RecordProps } from '../recordsWithProps'
import { arrowShapeVersions } from '../shapes/TLArrowShape'
import { TLBaseBinding } from './TLBaseBinding'

/** @public */
export interface ConnectorBindingProps {
	terminal: 'start' | 'end'
	normalizedAnchor: VecModel
	/**
	 * exact is whether the arrow head 'enters' the bound shape to point directly at the binding
	 * anchor point
	 */
	isExact: boolean
	/**
	 * precise is whether to bind to the normalizedAnchor, or to the middle of the shape
	 */
	isPrecise: boolean
}

/** @public */
export const arrowBindingProps: RecordProps<ConnectorBinding> = {
	terminal: T.literalEnum('start', 'end'),
	normalizedAnchor: vecModelValidator,
	isExact: T.boolean,
	isPrecise: T.boolean,
}

/** @public */
export type ConnectorBinding = TLBaseBinding<'connector', ConnectorBindingProps>

/** @public */
export const arrowBindingVersions = {} as const

/** @public */
export const arrowBindingMigrations = createBindingPropsMigrationSequence({
	sequence: [{ dependsOn: [arrowShapeVersions.ExtractBindings] }],
})
