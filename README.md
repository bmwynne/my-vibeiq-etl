<h1 align="center">My Vibeiq Etl</h1>

<p align="center">A solution for the Vibe IQ Technical takehome for an ETL.</p>

<p align="center">
	<!-- prettier-ignore-start -->
	<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
	<a href="#contributors" target="_blank"><img alt="👪 All Contributors: undefined" src="https://img.shields.io/badge/%F0%9F%91%AA_all_contributors-undefined-21bb42.svg" /></a>
<!-- ALL-CONTRIBUTORS-BADGE:END -->
	<!-- prettier-ignore-end -->
	<a href="https://github.com//my-vibeiq-etl/blob/main/.github/CODE_OF_CONDUCT.md" target="_blank"><img alt="🤝 Code of Conduct: Kept" src="https://img.shields.io/badge/%F0%9F%A4%9D_code_of_conduct-kept-21bb42" /></a>
	<a href="https://codecov.io/gh//my-vibeiq-etl" target="_blank"><img alt="🧪 Coverage" src="https://img.shields.io/codecov/c/github//my-vibeiq-etl?label=%F0%9F%A7%AA%20coverage" /></a>
	<a href="https://github.com//my-vibeiq-etl/blob/main/LICENSE.md" target="_blank"><img alt="📝 License: MIT" src="https://img.shields.io/badge/%F0%9F%93%9D_license-MIT-21bb42.svg" /></a>
	<a href="http://npmjs.com/package/my-vibeiq-etl" target="_blank"><img alt="📦 npm version" src="https://img.shields.io/npm/v/my-vibeiq-etl?color=21bb42&label=%F0%9F%93%A6%20npm" /></a>
	<img alt="💪 TypeScript: Strict" src="https://img.shields.io/badge/%F0%9F%92%AA_typescript-strict-21bb42.svg" />
</p>

## Usage

```shell
npm i my-vibeiq-etl
```

```ts
import {
	ItemTransformationService,
	CsvParsingRepositoryImpl,
} from "my-vibeiq-etl";

const csvParsingRepository = new CsvParsingRepositoryImpl();
const transformationService = new ItemTransformationService();

// Parse and transform CSV data
const csvContent =
	"familyFederatedId,optionFederatedId,title,details\nnike-air-max,,Nike Air Max,Classic athletic footwear";
const csvRows = await csvParsingRepository.parseCsvContent(csvContent);
const items = transformationService.transformCsvRowsToItems(csvRows);

console.log(`Processed ${items.length} items`);
```

## Development

See [`.github/CONTRIBUTING.md`](./.github/CONTRIBUTING.md), then [`.github/DEVELOPMENT.md`](./.github/DEVELOPMENT.md).
Thanks! 💖

<!-- You can remove this notice if you don't want it 🙂 no worries! -->

> 💝 This package was templated with [`create-typescript-app`](https://github.com/JoshuaKGoldberg/create-typescript-app) using the [Bingo framework](https://create.bingo).
