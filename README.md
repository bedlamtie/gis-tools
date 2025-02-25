# gis-tools

用于Node.js的GIS工具整合库，主要用于处理 GIS 数据。

**所有功能都是基于一些现有的lib实现，我只是代码搬运工**



平时自己用来处理一些数据以便放到web展示



## Build

### 安装依赖

```powershell
npm install
```

### 构建

构建为 ESM，CommonJs

```powershell
npm run build
```

### 使用

**方式一**

直接引用构建后的文件就行了

**方式二**

打包后引入

1. 打包
   
   ```powershell
   npm run build
   npm run pack
   ```

2. 安装
   打包后会在根目录生成一个 gis-tools-1.0.0.tgz 文件
   
   ```powershell
   npm install ./gis-tools-1.0.0.tgz
   ```

        或者使用`npm link`、私有仓库等。



## API

CommonJS 不能用 pbf 相关API，因为所依赖的pbf库只提供ESM Module

### protobuf（pbf） 和 geojson 转换

```typescript
// Protobuf 文件转换为 GeoJSON 对象
pbfFile2Geojson(pbf: string): Promise<GeoJSON.GeoJSON>

// 将 Protobuf 对象或者 Protobuf 文件转换为 GeoJSON 文件
pbf2geojsonFile(pbf: Pbf | Buffer | string, output: string): Promise<void>

// 将文件夹内的 pbf 文件转换为 geojson 文件
pbf2geojsonFiles(dir: string, outputDir?: string): Promise<void>

// 将多个 pbf 文件合并为一个 geojson 文件
mergePbfFiles2Geojson(input: string, output: string): Promise<void>

// 将 GeoJSON 对象或者 geojson 文件转换为 Protobuf 文件
geojson2pbfFile(geojson: GeoJSON | string, output: string): Promise<void>

// 将文件夹内的 geojson 文件转换为 Protobuf 文件
geojson2pbfFiles(dir: string, outputDir?: string): Promise<void>

/**
 * 将 GeoJSON 文件按照指定条件分组，并将每个分组的 GeoJSON 转换为 Protobuf 文件
 * @param input 输入文件路径或者 GeoJSON 对象
 * @param options 配置选项
 * @example
 * ```
 * const options = {
 *   outputDir: path.join(__dirname, 'output'),
 *   goupBy: feature => feature.properties.adcode.substring(0, 6),
 *   pbfPrefix: 'type_'
 * }
 * splitGeojaon2PbfFiles(path.join(__dirname, 'input.geojson'), options);
 * ```
 */
splitGeojaon2PbfFiles(input: string | GeoJSON, options: GeoJsonSplitOptions): Promise<void>
```

### shp 转 geojson

```typescript
// shp 文件转 geojson
shp2GeoJSON(shpFilePath: string, dbfFilePath?: string, options?: shapefile.Options): Promise<GeoJSON>
```

### KML 转 geojson

```typescript
// kml 文件转 geojson
kml2Geojson(kml: Buffer | string): Promise<GeoJSON>
```

### 经纬度坐标系转换（gcoord）

```typescript
// 转换坐标或GeoJSON的坐标系
transformCoordinates<T extends GeoJSON | Position>(input: T | string, crsFrom: CRSTypes, crsTo: CRSTypes): T
```

### 转换天地图下载的行政区划代码文件为Dict json文件

```typescript
/**
 * 区划编码数组转换为字典
 * @description 输入的数据可以通过天地图下载：http://lbs.tianditu.gov.cn/server/administrative2.html
 * @example
 * [{"province_adcode": "110000", "province": "北京市", "city_adcode": "110100", "city": "北京市", "county_adcode": "110101", "county": "东城区", "town_adcode": "110101001", "town": "东城区"}]
 * 转换为
 * {"110000": "北京市", "110100": "北京市", "110101": "东城区", "110101001": "东城区"}
 */
districtArrayToDict(input: Array<DistrictItem> | string): Promise<Record<string, string>>
```

### 通过QGIS生成的PNG图像、PGW文件、WKT文件，计算其bounds

```typescript
// 通过QGIS生成的PNG图像、PGW文件、WKT文件，计算其bounds
imgPgwBounds(imgPath: string, pgwPath: string, xmlPath: string): Promise<Array<number>>
```

### 通过经纬度查找所处的行政区域信息（需要geobuf文件夹）

```typescript

/**
 * 填充坐标点所在的行政区划信息
 * @description 需要搭配 geopbf 目录使用（有点麻烦）。
 * @example
 * pbf文件可以通过splitGeojaon2PbfFiles函数生成，比如一个包含所有城市的geojson文件可以生成一个city文件夹
 * geopbf 目录结构如下：
 * - geopbf
 *   - province
 *     - 000000.pbf // 包含中国所有省行政区边界
 *   - city
 *     - 110000.pbf // 包含一个省下的所有市行政区边界
 *     - 120000.pbf
 *   - county
 *     - 310100.pbf
 *     - 310400.pbf
 *   - township
 *     - 310101.pbf
 *     - 310102.pbf
 *   - village
 *     - 310101001.pbf
 *     - 310101002.pbf
 *
 * @param geopbfDir 下载的 geopbf 目录
 * @param options 填充行政区划的配置
 */coordDecompilar(geopbfDir: string, options: FillDistrictOptions): Promise<void>
```
