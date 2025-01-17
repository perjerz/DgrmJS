import { shapeStateDel } from '../utils/shape-utils.js';

/** @implements {IDiagramPrivateEventProcessor} */
export class PathEvtProc {
	/**
	 * @param {IDiagramPrivate} diagram
	 */
	constructor(diagram) {
		/** @private */
		this._diagram = diagram;
	}

	/**
	 * @param {IDiagramElement} elem
	 * @return {boolean}
	 */
	canProcess(elem) { return elem.type === 'path'; }

	/**
	 * @param {IPresenterPath} path
	 * @param {IDiagramPrivateEvent} evt
	 */
	process(path, evt) {
		switch (evt.type) {
			case 'pointerup':
				this._diagram.selected = path;
				break;
			case 'unselect':
				shapeStateDel(path, 'selected');
				break;
		}
	}
}
