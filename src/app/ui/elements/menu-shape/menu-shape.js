/** @implements {Menu} */
export class Menu extends HTMLElement {
	connectedCallback() {
		const shadow = this.attachShadow({ mode: 'closed' });
		shadow.innerHTML =
			`<style>
			.menu {
				overflow-x: auto;
				padding: 0;
				position: fixed;
				bottom: 15px;
				left: 50%;
				transform: translateX(-50%);
				box-shadow: 0px 0px 58px 2px rgba(34, 60, 80, 0.2);
				border-radius: 16px;
				background-color: rgba(255,255,255, .9);
			}

			.content {
				white-space: nowrap;
				display: flex;
			}
			
			[data-cmd] {
				cursor: pointer;
			}

			.menu svg {
				height: 42px;
				display: inline-block;
				padding: 15px 10px;
				stroke: #344767;
				stroke-width: 2px;
				fill: #fff;
				width: 42px;
				min-width: 42px;
			}
		
			.menu .big {
				width: 62px;
				min-width: 62px;
			}

			@media only screen and (max-width: 700px) {
				.menu {
					width: 100%;
					border-radius: 0;
					bottom: 0;
					display: flex;
  					flex-direction: column;
				}

				.content {
					align-self: center;
				}
			}
			</style>
			<div id="menu" class="menu" style="touch-action: none;">
				<div class="content">
					<svg data-cmd="shapeAdd" data-cmd-arg="circle" style="padding-left: 20px;">
						<circle r="20" cx="21" cy="21"></circle>
					</svg>
					<svg data-cmd="shapeAdd" data-cmd-arg="rect" class="big">
						<rect x="1" y="1" width="60" height="40" rx="15" ry="15"></rect>
					</svg>
					<svg data-cmd="shapeAdd" data-cmd-arg="rhomb" class="big">
						<g transform="translate(1,1)">
							<path d="M0 20 L30 0 L60 20 L30 40 Z" stroke-width="2" stroke-linejoin="round"></path>
						</g>
					</svg>
					<svg data-cmd="shapeAdd" data-cmd-arg="text">
						<text x="5" y="40" font-size="52px" fill="#344767" stroke-width="0">T</text>
					</svg>
				</div>
			</div>`;

		const menu = shadow.getElementById('menu');
		menu.querySelectorAll('[data-cmd="shapeAdd"]').forEach(el => el.addEventListener('pointerdown', this));
		menu.addEventListener('pointerleave', this);
		menu.addEventListener('pointerup', this);
		menu.addEventListener('pointermove', this);
	};

	/**
	 * @param {IAppDiagramSerializable} diagram
	 */
	init(diagram) {
		/** @private */
		this._diagram = diagram;
	}

	/** @param {PointerEvent & { currentTarget: Element }} evt */
	handleEvent(evt) {
		switch (evt.type) {
			case 'pointermove':
				if (!this._isNativePointerleaveTriggered) {
					// emulate pointerleave for mobile

					const pointElem = document.elementFromPoint(evt.clientX, evt.clientY);
					if (pointElem === this._pointElem) {
						return;
					}

					// pointerleave
					if (this._parentElem === this._pointElem) {
						this._diagram.svg.setPointerCapture(evt.pointerId);
					}

					/**
					 * @type {Element}
					 * @private
					 */
					this._pointElem = pointElem;
				}
				break;
			case 'pointerleave':
				this._isNativePointerleaveTriggered = true;

				if (this._pressedShapeTemplKey) {
					// when shape drag out from menu panel

					this._diagram.shapeActiveAdd({
						templateKey: this._pressedShapeTemplKey,
						position: {
							x: evt.clientX,
							y: evt.clientY
						},
						props: {
							text: { textContent: 'Title' }
						}
					});
				}
				this._clean();
				break;
			case 'pointerdown':
				this._pressedShapeTemplKey = evt.currentTarget.getAttribute('data-cmd-arg');

				// for emulate pointerleave
				this._parentElem = document.elementFromPoint(evt.clientX, evt.clientY);
				this._pointElem = this._parentElem;
				this._isNativePointerleaveTriggered = null;
				break;
			case 'pointerup':
				this._clean();
				break;
		}
	}

	/** @private */
	_clean() {
		this._pressedShapeTemplKey = null;
		this._parentElem = null;
		this._pointElem = null;
	}
}
customElements.define('ap-menu-shape', Menu);
