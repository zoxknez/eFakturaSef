module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@sef-app/shared$': '<rootDir>/../shared/src/index.ts',
    '^isomorphic-dompurify$': '<rootDir>/src/tests/__mocks__/isomorphic-dompurify.ts',
    '^xmlbuilder2$': '<rootDir>/src/tests/__mocks__/xmlbuilder2.ts',
  },
  transformIgnorePatterns: [
    "node_modules/(?!(@oozcitak|xmlbuilder2|isomorphic-dompurify)/)"
  ],
};
