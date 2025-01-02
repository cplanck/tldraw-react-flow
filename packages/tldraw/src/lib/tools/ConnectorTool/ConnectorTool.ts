import { StateNode, TLStateNodeConstructor } from '@tldraw/editor'
import { Idle } from 'tldraw/src/lib/shapes/connector/toolStates/Idle'
import { Pointing } from 'tldraw/src/lib/shapes/connector/toolStates/Pointing'

/** @public */
export class ConnectorTool extends StateNode {
	static override id = 'connector'
	static override initial = 'idle'
	static override children(): TLStateNodeConstructor[] {
		return [Idle, Pointing]
	}

	override shapeType = 'connector'
}
