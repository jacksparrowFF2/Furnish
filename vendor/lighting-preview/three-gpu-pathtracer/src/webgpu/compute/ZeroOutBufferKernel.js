import { IndirectStorageBufferAttribute } from '../../../../three/build/three.webgpu.js';
import { ComputeKernel } from './ComputeKernel.js';
import { storage, globalId } from '../../../../three/build/three.tsl.js';
import { wgslTagFn } from '../../../../three-mesh-bvh/src/webgpu/index.js';

export class ZeroOutBufferKernel extends ComputeKernel {

	constructor( options = {} ) {

		const {
			type = 'u32',
		} = options;

		const params = {
			globalId: globalId,
			outputTarget: storage( new IndirectStorageBufferAttribute( 1, 1 ), type ),
		};

		const fn = wgslTagFn/* wgsl */`
			fn compute( globalId: vec3u ) -> void {

				${ params.outputTarget }[ globalId.x ] = 0;

			}
		`;

		super( fn( params ) );

		this.defineUniformAccessors( {
			target: params.outputTarget,
		} );

	}

}
