import { executeCommandRequest } from './executeCommand';
import { createPetInjectionRequest } from './createPet';
import { readFileRequest } from './readFile';
import { testLlmRequest } from './testLLM';
import type { SpecialRequest } from './types';

export const specialRequests: SpecialRequest[] = [
    executeCommandRequest,
    createPetInjectionRequest,
    readFileRequest,
    testLlmRequest,
];

export * from './types';
