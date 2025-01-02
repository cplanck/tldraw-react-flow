import { TLArrowShapeArrowheadStyle, VecLike } from '@tldraw/editor'
import { ConnectorBindings } from './shared'

/** @public */
export interface TLArrowPoint {
	handle: VecLike
	point: VecLike
	arrowhead: TLArrowShapeArrowheadStyle
}

/** @public */
export interface TLArcInfo {
	center: VecLike
	radius: number
	size: number
	length: number
	largeArcFlag: number
	sweepFlag: number
}

/** @public */
export type TLArrowInfo =
	| {
			bindings: ConnectorBindings
			isStraight: false
			start: TLArrowPoint
			end: TLArrowPoint
			middle: VecLike
			handleArc: TLArcInfo
			bodyArc: TLArcInfo
			isValid: boolean
	  }
	| {
			bindings: ConnectorBindings
			isStraight: true
			start: TLArrowPoint
			end: TLArrowPoint
			middle: VecLike
			isValid: boolean
			length: number
	  }
