import { SetMetadata } from '@nestjs/common';

export const BYPASS_TRANSFORM_KEY = 'bypass_transform';

/** Applied to controllers or handlers that manage their own response shape. */
export const BypassTransform = () => SetMetadata(BYPASS_TRANSFORM_KEY, true);
