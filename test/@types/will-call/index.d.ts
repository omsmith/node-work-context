/* eslint @typescript-eslint/no-explicit-any: "off" */

declare module 'will-call' {

	class WillCall {
		public expect(fn: (...args: any[]) => any, expected?: number): (...args: any[]) => any;
		public check(): {
			expected: number;
			actual: number;
			stack: string;
			name: string;
		}[];
	}

	export = WillCall;
}
