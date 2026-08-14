import { Global, Module } from '@nestjs/common';
import { ProfileShaper } from './profile-shaper';

@Global()
@Module({
  providers: [ProfileShaper],
  exports: [ProfileShaper],
})
export class ProfileModule {}
