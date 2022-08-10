import { shapeMove, shapeMoveEnd } from '../../diagram/event-processors/shape-evt-proc.js';
import { shapeStateDel, shapeStateSet } from '../../diagram/shape-utils.js';
import { elemCreateByTemplate } from '../../diagram/svg-presenter/svg-presenter-utils.js';
import { parseCenterAttr } from '../svg-utils.js';

/** shape center position */
const shapeCenter = Symbol(0);
/** inner shape center  */
const shapeInnerCenter = Symbol(0);
/** @typedef {ISvgPresenterShape & { [shapeCenter]?: Point, [shapeInnerCenter]?: Point }} SelecEvtProcShape */

/** @implements {IDiagramPrivateEventProcessor} */
export class CanvasSelecEvtProc {
	/**
	 * @param {IDiagramPrivate} diagram
	 * @param {SVGSVGElement} svg
	 */
	constructor(diagram, svg) {
		/**
		 * @type {Set<SelecEvtProcShape>}
		 * @private
		 */
		this._shapes = new Set();

		/** @private */
		this._diagram = diagram
			.on('add', /** @param {CustomEvent<IDiagramEventDetail<ISvgPresenterShape>>} evt */ evt => {
				if (evt.detail.target.type === 'shape') { this._shapes.add(evt.detail.target); }
			})
			.on('del', /** @param {CustomEvent<IDiagramEventDetail<ISvgPresenterShape>>} evt */ evt => this._shapes.delete(evt.detail.target));

		/** @private */
		this._svg = svg;
	}

	/**
	 * @param {IDiagramElement} elem
	 * @return {boolean}
	 */
	canProcess(elem) {
		const canProcess = elem.type === 'canvas' || this._selectedShapes?.has(/** @type {SelecEvtProcShape} */(elem));
		if (!canProcess) {
			// clean selected
			this._selectedClean();
		}
		return canProcess;
	}

	/**
	 * @param {IDiagramElement} elem
	 * @param {IDiagramPrivateEvent} evt
	 */
	process(elem, evt) {
		switch (evt.type) {
			case 'pointermove':
				this._timerDel();
				this._downElem = null;

				// select rectangle
				if (this._selectRect) {
					// highlight selected shapes
					this._shapeInRectSelect();

					// draw select rect
					rectDraw(this._selectRect, evt);
					return;
				}

				// selected shapes move
				if (this._isDownOnSelectedShape) {
					this._selectedShapes.forEach(shape => shapeMove(this._diagram, shape, evt));
					return;
				}

				// canvas move
				shapeMove(this._diagram, /** @type {ISvgPresenterShape} */(elem), evt); // only 'canvas' can be here
				break;

			case 'pointerdown':
				this._diagram.selected = null;

				/** @private */
				this._downElem = evt.detail.target;

				/** @private */
				this._isDownOnSelectedShape = this._selectedShapes?.has(/** @type {SelecEvtProcShape} */(evt.detail.target));

				if (elem.type !== 'canvas') { return; }

				//
				// long tap on cancas

				/** @private */
				this._timer = setTimeout(_ => {
					this._timerDel();

					// clean selected
					this._selectedClean();

					// calc shape centers
					const canvasPosition = /** @type {ISvgPresenterShape} */(elem).positionGet();
					this._shapes.forEach(shape => {
						// TODO: refactor - shapeInnerCenter get one time for shape template key

						if (!shape[shapeInnerCenter]) {
							shape[shapeInnerCenter] = parseCenterAttr(shape.svgEl);
						}

						const shapePosition = shape.positionGet();
						shape[shapeCenter] = {
							x: shapePosition.x + shape[shapeInnerCenter].x + canvasPosition.x,
							y: shapePosition.y + shape[shapeInnerCenter].y + canvasPosition.y
						};
					});

					// draw select rect
					/** @private */
					this._selectRect = rectCreate(this._svg, { x: evt.detail.clientX, y: evt.detail.clientY });
				}, 500);
				break;
			case 'canvasleave':
			case 'pointerup': {
				this._diagram.activeElement = null; // for 'canvasleave'
				this._timerDel();

				// click
				if (this._downElem) {
					this._downElem = null;

					// click on canvas
					if (evt.detail.target.type === 'canvas') {
						this._selectedClean();
						return;
					}

					// click on selected shape
					this.onShapeClick();
					return;
				}

				// select rectangle
				if (this._selectRect) {
					this._selectEnd();
					return;
				}

				// selected shapes move end
				if (this._isDownOnSelectedShape) {
					this._selectedShapes.forEach(shape => shapeMoveEnd(shape));
					this._isDownOnSelectedShape = false;
					return;
				}

				// canvas move end
				shapeMoveEnd(/** @type {ISvgPresenterShape} */(elem)); // only 'canvas' can be here
				break;
			}
		}
	}

	/**
	 * when click on selected shape
	 * override this method if you need to process this evt
	 */
	onShapeClick() {
		this._selectedClean();
	}

	/** @private */
	_selectedClean() {
		this._selectedShapes?.forEach(shape => shapeStateDel(shape, 'highlighted'));
		this._selectedShapes = null;
	}

	/**
	 * @param {boolean?=} getShapes
	 * @returns {Set<SelecEvtProcShape>}
	 * @private
	 */
	_shapeInRectSelect(getShapes) {
		/** @type {Set<SelecEvtProcShape>} */
		const shapesInRect = getShapes ? new Set() : null;
		this._shapes.forEach(shape => {
			const isInRect = document.elementFromPoint(shape[shapeCenter].x, shape[shapeCenter].y) === this._selectRect;
			shapeStateSet(shape, 'highlighted', isInRect);

			if (getShapes && isInRect) {
				shapesInRect.add(shape);
			}
		});
		return shapesInRect?.size > 0 ? shapesInRect : null;
	}

	/** @private */
	_selectEnd() {
		/** @private */
		this._selectedShapes = this._shapeInRectSelect(true);

		rectDel(this._selectRect);
		this._selectRect = null;
	}

	/** @private */
	_timerDel() {
		if (this._timer) { clearTimeout(this._timer); }
		this._timer = null;
	}
}

/** point where selectRect starts */
const rectStartPoint = Symbol(0);
/** link to svg circle, that was added to show rect start drawing */
const rectStartElem = Symbol(0);

/** @typedef {SVGRectElement & { [rectStartPoint]?: Point, [rectStartElem]?: SVGCircleElement }} SelectRect */

/**
 * @param {SVGSVGElement} svg
 * @param {Point} position
 * @return {SVGRectElement}
 */
function rectCreate(svg, position) {
	// TODO: check positon if SVG is not full screen

	const selectRect = /** @type {SelectRect} */(elemCreateByTemplate(svg, 'select'));
	selectRect.x.baseVal.value = position.x;
	selectRect.y.baseVal.value = position.y;
	selectRect[rectStartPoint] = position;

	// circle to show rect start drawing
	selectRect[rectStartElem] = /** @type {SVGCircleElement} */(elemCreateByTemplate(svg, 'select-start'));
	selectRect[rectStartElem].cx.baseVal.value = position.x;
	selectRect[rectStartElem].cy.baseVal.value = position.y;

	return selectRect;
}

/**
 * @param {SelectRect} selectRect
 * @param {IDiagramPrivateEvent} evt
 */
function rectDraw(selectRect, evt) {
	if (selectRect[rectStartElem]) {
		selectRect[rectStartElem].remove();
		delete selectRect[rectStartElem];
	}

	const x = evt.detail.clientX - selectRect[rectStartPoint].x;
	const y = evt.detail.clientY - selectRect[rectStartPoint].y;

	selectRect.width.baseVal.value = Math.abs(x);
	if (x < 0) {
		selectRect.x.baseVal.value = evt.detail.clientX;
	}

	selectRect.height.baseVal.value = Math.abs(y);
	if (y < 0) {
		selectRect.y.baseVal.value = evt.detail.clientY;
	}
}

/** @param {SelectRect} selectRect */
function rectDel(selectRect) {
	if (selectRect[rectStartElem]) {
		selectRect[rectStartElem].remove();
		delete selectRect[rectStartElem];
	}
	selectRect.remove();
}
