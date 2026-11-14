import { Camera } from '../../../three/build/three.webgpu.js';

export class EquirectCamera extends Camera {

	constructor() {

		super();

		this.isEquirectCamera = true;

	}

}
