// Touch controls translate gestures into the same input used by the desktop game.
// The view itself handles looking around; this overlay owns movement and actions.
export class MobileControls {

	constructor( app, ui ) {

		this.app = app;
		this.ui = ui;
		this.input = app.input;
		this.resets = [];
		this.enabled = matchMedia( '(pointer: coarse)' ).matches;
		if ( ! this.enabled ) return;

		const root = this.root = document.createElement( 'div' );
		root.className = 'tw-mobile-controls tw-interactive';
		root.setAttribute( 'aria-label', 'Touch game controls' );

		const stick = this.stick = document.createElement( 'div' );
		stick.className = 'tw-mobile-stick';
		stick.setAttribute( 'aria-label', 'Move: drag in any direction' );
		stick.innerHTML = '<div class="tw-mobile-stick-ring"></div><div class="tw-mobile-stick-knob"></div>';
		this.knob = stick.lastElementChild;
		root.append( stick );
		this.bindStick();

		const actions = document.createElement( 'div' );
		actions.className = 'tw-mobile-actions';
		root.append( actions );
		this.addButton( actions, 'Rod', 'Take out or put away rod', 'KeyR' );
		this.addButton( actions, 'Use', 'Interact', 'KeyE' );
		this.addButton( actions, 'Run', 'Sprint or boat boost', 'ShiftLeft' );
		this.addButton( actions, 'Up', 'Jump or swim up', 'Space' );
		this.addButton( actions, 'Dive', 'Crouch or dive', 'KeyC' );
		this.retrieve = this.addButton( actions, 'In', 'Retrieve empty line', 'right' );
		this.primary = this.addButton( actions, 'Cast', 'Cast, strike or reel', 'left' );
		this.primary.classList.add( 'tw-mobile-primary' );
		this.more = this.addButton( actions, 'More', 'More controls', null );
		this.more.addEventListener( 'click', () => this.menu.hidden = ! this.menu.hidden );

		const menu = this.menu = document.createElement( 'div' );
		menu.className = 'tw-mobile-menu';
		menu.hidden = true;
		root.append( menu );
		for ( const [ label, code ] of [
			[ 'Cooler & log', 'KeyI' ], [ 'Boat view', 'KeyV' ],
			[ 'Free camera', 'KeyF' ], [ 'Flashlight', 'KeyL' ],
			[ 'Pause time', 'KeyT' ], [ 'Mute', 'KeyM' ],
		] ) {

			const button = this.addButton( menu, label, label, code );
			button.addEventListener( 'click', () => { menu.hidden = true; } );

		}
		for ( const [ label, action ] of [
			[ 'Settings', () => ui.togglePanel( true ) ],
			[ 'Help', () => ui.toggleHelp( true ) ],
			[ 'Photo mode', () => ui.setPhotoMode( true ) ],
		] ) {

			const button = this.addButton( menu, label, label, null );
			button.addEventListener( 'click', () => { menu.hidden = true; action(); } );

		}

		ui.root.append( root );

	}

	addButton( parent, label, description, code ) {

		const button = document.createElement( 'button' );
		button.type = 'button';
		button.className = 'tw-mobile-button';
		button.textContent = label;
		button.setAttribute( 'aria-label', description );
		parent.append( button );
		if ( ! code ) return button;

		let pointer = null;
		const press = ( e ) => {

			if ( pointer !== null || ! this.active ) return;
			e.preventDefault();
			e.stopPropagation();
			pointer = e.pointerId;
			button.setPointerCapture( pointer );
			button.classList.add( 'is-held' );
			if ( code === 'left' ) this.input.pressVirtualMouse( 'left' );
			else if ( code === 'right' ) this.input.pressVirtualMouse( 'right' );
			else this.input.pressVirtual( code );

		};
		const release = ( e ) => {

			if ( e.pointerId !== pointer ) return;
			pointer = null;
			button.classList.remove( 'is-held' );
			if ( code === 'left' ) this.input.releaseVirtualMouse( 'left' );
			else if ( code === 'right' ) this.input.releaseVirtualMouse( 'right' );
			else this.input.releaseVirtual( code );

		};
		button.addEventListener( 'pointerdown', press );
		button.addEventListener( 'pointerup', release );
		button.addEventListener( 'pointercancel', release );
		button.addEventListener( 'lostpointercapture', release );
		this.resets.push( () => { pointer = null; button.classList.remove( 'is-held' ); } );
		return button;

	}

	bindStick() {

		let pointer = null;
		const keys = [ 'KeyW', 'KeyA', 'KeyS', 'KeyD' ];
		const set = ( e ) => {

			const rect = this.stick.getBoundingClientRect();
			const radius = rect.width * 0.34;
			const x = Math.max( - 1, Math.min( 1, ( e.clientX - rect.left - rect.width / 2 ) / radius ) );
			const y = Math.max( - 1, Math.min( 1, ( e.clientY - rect.top - rect.height / 2 ) / radius ) );
			const length = Math.max( 1, Math.hypot( x, y ) );
			this.knob.style.transform = `translate(${ x / length * radius }px, ${ y / length * radius }px)`;
			const selected = [ y < - 0.28, x < - 0.28, y > 0.28, x > 0.28 ];
			keys.forEach( ( key, i ) => selected[ i ] ? this.input.pressVirtual( key ) : this.input.releaseVirtual( key ) );

		};
		const end = ( e ) => {

			if ( e.pointerId !== pointer ) return;
			pointer = null;
			this.knob.style.transform = '';
			keys.forEach( ( key ) => this.input.releaseVirtual( key ) );

		};
		this.stick.addEventListener( 'pointerdown', ( e ) => {

			if ( pointer !== null || ! this.active ) return;
			e.preventDefault();
			pointer = e.pointerId;
			this.stick.setPointerCapture( pointer );
			set( e );

		} );
		this.stick.addEventListener( 'pointermove', ( e ) => { if ( e.pointerId === pointer ) set( e ); } );
		this.stick.addEventListener( 'pointerup', end );
		this.stick.addEventListener( 'pointercancel', end );
		this.stick.addEventListener( 'lostpointercapture', end );
		this.resets.push( () => { pointer = null; this.knob.style.transform = ''; } );

	}

	update() {

		if ( ! this.enabled ) return;
		const game = this.app.game, hud = game.hud;
		const active = ! this.ui._start && ! this.ui._help && ! this.ui._photo && ! this.ui._panelOpen &&
			! game.guide?.open && ! hud?.invOpen && ! hud?.standOpen && ! hud?.catchOpen;
		if ( ! active && this.active ) {

			this.input.clearVirtual();
			this.resets.forEach( ( reset ) => reset() );
			this.menu.hidden = true;

		}
		this.active = active;
		this.root.hidden = ! active;
		if ( ! active ) return;
		const rod = game.rod;
		this.primary.disabled = ! rod.equipped;
		this.primary.textContent = game.fight ? 'Reel' : rod.state === 'floating' ? 'Strike' : rod.state === 'windup' ? 'Cast…' : 'Cast';
		this.retrieve.hidden = ! rod.lineInWater || !! game.fight;

	}

}
