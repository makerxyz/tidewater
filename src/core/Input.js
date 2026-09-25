// Keyboard, mouse and virtual touch input with pointer lock support.
export class Input {

	constructor( dom ) {

		this.dom = dom;
		this.keys = new Set();
		this.virtualKeys = new Set();
		this.pressed = new Set();
		this.look = { x: 0, y: 0 };
		this.wheel = 0;
		this.mouseDown = false;
		this.rightDown = false;
		this.virtualMouseDown = false;
		this.virtualRightDown = false;
		this.virtualMousePressed = false;
		this.virtualMouseReleased = false;
		this.virtualRightPressed = false;
		this.locked = false;
		this.enabled = true;

		window.addEventListener( 'keydown', ( e ) => {

			if ( e.target && ( e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA' ) ) return;
			if ( ! this.keys.has( e.code ) ) this.pressed.add( e.code );
			this.keys.add( e.code );
			if ( [ 'Space', 'ArrowUp', 'ArrowDown', 'Tab' ].includes( e.code ) ) e.preventDefault();

		} );
		window.addEventListener( 'keyup', ( e ) => this.keys.delete( e.code ) );
		window.addEventListener( 'blur', () => {

			this.keys.clear();
			this.clearVirtual();

		} );

		dom.addEventListener( 'mousedown', ( e ) => {

			if ( e.button === 0 ) this.mouseDown = true;
			if ( e.button === 2 ) this.rightDown = true;

		} );
		window.addEventListener( 'mouseup', ( e ) => {

			if ( e.button === 0 ) this.mouseDown = false;
			if ( e.button === 2 ) this.rightDown = false;

		} );
		dom.addEventListener( 'contextmenu', ( e ) => e.preventDefault() );
		window.addEventListener( 'mousemove', ( e ) => {

			if ( this.locked || this.mouseDown || this.rightDown ) {

				this.look.x += e.movementX;
				this.look.y += e.movementY;

			}

		} );
		dom.addEventListener( 'wheel', ( e ) => {

			this.wheel += Math.sign( e.deltaY );
			e.preventDefault();

		}, { passive: false } );
		// A free finger on the view looks around. UI controls capture their own pointers.
		let touchId = null, lastX = 0, lastY = 0;
		dom.addEventListener( 'pointerdown', ( e ) => {

			if ( e.pointerType !== 'touch' || touchId !== null ) return;
			touchId = e.pointerId;
			lastX = e.clientX;
			lastY = e.clientY;
			dom.setPointerCapture( e.pointerId );

		} );
		dom.addEventListener( 'pointermove', ( e ) => {

			if ( e.pointerId !== touchId ) return;
			this.look.x += ( e.clientX - lastX ) * 1.4;
			this.look.y += ( e.clientY - lastY ) * 1.4;
			lastX = e.clientX;
			lastY = e.clientY;

		} );
		const endTouch = ( e ) => { if ( e.pointerId === touchId ) touchId = null; };
		dom.addEventListener( 'pointerup', endTouch );
		dom.addEventListener( 'pointercancel', endTouch );

		document.addEventListener( 'pointerlockchange', () => {

			this.locked = document.pointerLockElement === dom;

		} );

	}

	requestLock() {

		if ( ! this.locked ) this.dom.requestPointerLock?.()?.catch?.( () => {} );

	}

	down( code ) {

		return this.enabled && ( this.keys.has( code ) || this.virtualKeys.has( code ) );

	}

	// true once per physical key press
	hit( code ) {

		return this.enabled && this.pressed.has( code );

	}

	pressVirtual( code ) {

		if ( ! this.virtualKeys.has( code ) ) this.pressed.add( code );
		this.virtualKeys.add( code );

	}

	releaseVirtual( code ) {

		this.virtualKeys.delete( code );

	}

	pressVirtualMouse( button ) {

		if ( button === 'left' ) {

			if ( ! this.virtualMouseDown ) this.virtualMousePressed = true;
			this.virtualMouseDown = true;

		} else {

			if ( ! this.virtualRightDown ) this.virtualRightPressed = true;
			this.virtualRightDown = true;

		}

	}

	releaseVirtualMouse( button ) {

		if ( button === 'left' ) {

			if ( this.virtualMouseDown ) this.virtualMouseReleased = true;
			this.virtualMouseDown = false;

		} else this.virtualRightDown = false;

	}

	clearVirtual() {

		this.virtualKeys.clear();
		this.virtualMouseDown = false;
		this.virtualRightDown = false;
		this.virtualMousePressed = false;
		this.virtualMouseReleased = false;
		this.virtualRightPressed = false;

	}

	consumeLook() {

		const l = { x: this.look.x, y: this.look.y };
		this.look.x = 0;
		this.look.y = 0;
		return l;

	}

	consumeWheel() {

		const w = this.wheel;
		this.wheel = 0;
		return w;

	}

	endFrame() {

		this.pressed.clear();
		this.virtualMousePressed = false;
		this.virtualMouseReleased = false;
		this.virtualRightPressed = false;

	}

}
