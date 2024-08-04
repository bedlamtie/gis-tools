import fs from 'fs-extra'

interface DistrictItem {
  province_adcode: string
  province: string
  city_adcode: string
  city: string
  county_adcode: string
  county: string
  town_adcode: string
  town: string
}

export { DistrictItem }

/**
 * 区划编码数组转换为字典
 * @description 输入的数据可以通过天地图下载：http://lbs.tianditu.gov.cn/server/administrative2.html
 * @example
 * [{"province_adcode": "110000", "province": "北京市", "city_adcode": "110100", "city": "北京市", "county_adcode": "110101", "county": "东城区", "town_adcode": "110101001", "town": "东城区"}]
 * 转换为
 * {"110000": "北京市", "110100": "北京市", "110101": "东城区", "110101001": "东城区"}
 */
export async function districtArrayToDict(input: Array<DistrictItem> | string): Promise<Record<string, string>> {
  if (typeof input === 'string') {
    input = await fs.readJSON(input) as Array<DistrictItem>
  }
  const dict = {}
  input.forEach((item) => {
    dict[item.province_adcode] = item.province
    dict[item.city_adcode] = item.city
    dict[item.county_adcode] = item.county
    dict[item.town_adcode] = item.town
  })
  return dict
}
