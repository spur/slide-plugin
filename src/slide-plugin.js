import { tapEvents, getTap, currentTap } from 'spur-taps';
import tapLock from 'spur-tap-lock';

const SLIDE_THRESHOLD = 8;

function didSwipe(slideDelta, timeDelta) {
  let distance = Math.abs(slideDelta);
  return distance > 10 && distance / timeDelta > 0.65;
}

class SlidePlugin {
  constructor(enable=true, axis=false) {
    this.enable = enable;
    this.axis = axis;
  }

  slideStart(tap, boundingBox) {
    if (this.reactComponent.onSlideStart) { this.reactComponent.onSlideStart(tap, boundingBox); }
    if (this.reactComponent.props.onSlideStart) { this.reactComponent.props.onSlideStart(tap, boundingBox); }
  }

  sliding(tap) {
    if (this.reactComponent.onSlide) { this.reactComponent.onSlide(tap); }
    if (this.reactComponent.props.onSlide) { this.reactComponent.props.onSlide(tap); }
  }

  slideEnd(lastTap, startTap, didSwipe) {
    if (this.reactComponent.onSlideEnd) { this.reactComponent.onSlideEnd(lastTap, startTap, didSwipe); }
    if (this.reactComponent.props.onSlideEnd) { this.reactComponent.props.onSlideEnd(lastTap, startTap, didSwipe); }
  }

  setEnable(enable) {
    this.enable = enable;
  }

  setAxis(axis) {
    this.axis = axis;
  }

  reset() {
    document.body.removeEventListener(tapEvents.move, this.tapMoveBound);
    this.tapMoveBound = null;
    document.body.removeEventListener(tapEvents.end, this.tapEndBound);
    this.tapEndBound = null;
    this.isInitiated = false;
  }

  cancel() {
    if (this.isSliding) {
      this.isSliding = false;
      this.slideEnd(currentTap, this.startTap, false);
    }
    this.reset();
  }

  onDOMTapMove(e) {
    let tap = getTap(e);
    if (!this.isSliding) {
      let deltaX = tap.x - this.startTap.x;
      let deltaY = tap.y - this.startTap.y;
      let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (distance < SLIDE_THRESHOLD) {
        return;
      }

      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        if ((!this.axis || this.axis === 'y') && tapLock.requestHandle(this)) {
          this.isSliding = true;
          this.slideStart(tap, this.boundingBox);
        } else {
          this.reset();
        }
        return;
      }

      if ((!this.axis || this.axis === 'x') && tapLock.requestHandle(this)) {
        this.isSliding = true;
        this.slideStart(tap, this.boundingBox);
      } else {
        this.reset();
      }
    }

    if (tap.count !== 1) { return; }

    e.preventDefault();
    this.sliding(tap);
    // let slideOut = tap.x < 0 || tap.x > this.boundingBox.width || tap.y < 0 || tap.y > this.boundingBox.height;
  }

  onDOMTapStart(e) {
    let tap = getTap(e);
    if (!this.enable || this.isInitiated) { return; }
    this.isInitiated = true;
    this.isSliding = false;
    this.startTime = Date.now();

    this.startTap = {
      x: tap.x,
      y: tap.y
    }

    this.boundingBox = this.DOMNode.getBoundingClientRect();
    this.tapMoveBound = this.onDOMTapMove.bind(this);
    document.body.addEventListener(tapEvents.move, this.tapMoveBound);
    this.tapEndBound = this.onDOMTapEnd.bind(this);
    document.body.addEventListener(tapEvents.end, this.tapEndBound);
  }

  onDOMTapEnd(e) {
    let tap = getTap(e);
    if (tap.count > 0) { return; }

    if (this.isSliding) {
      let timeDelta = Date.now() - this.startTime;
      let swipe;
      if (this.axis) {
        swipe = didSwipe(tap[this.axis] - this.startTap[this.axis], timeDelta);
      } else {
        swipe = didSwipe(tap.x - this.startTap.x, timeDelta) && 'x' || didSwipe(tap.y - this.startTap.y, timeDelta) && 'y';
      }

      e.preventDefault();
      this.slideEnd(tap, this.startTap, swipe);
    }

    this.isSliding = false;
    this.reset();
  }

  setAttachedComponent(reactComponent, DOMNode) {
    this.reactComponent = reactComponent;
    this.DOMNode = DOMNode;
    this.tapStartBound = this.onDOMTapStart.bind(this);
    this.DOMNode.addEventListener(tapEvents.start, this.tapStartBound);
  }

  tearDown() {
    this.DOMNode.removeEventListener(tapEvents.start, this.tapStartBound);
    this.tapStartBound = null;
    this.DOMNode = null;
    this.reset();
  }
}

export default SlidePlugin;
