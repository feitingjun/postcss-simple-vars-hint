# postcss-simple-vars-hint README

[https://github.com/feitingjun/postcss-simple-vars-hint](https://github.com/feitingjun/postcss-simple-vars-hint)

## 功能
此扩展为PostCss的[postcss-simple-vars](https://github.com/postcss/postcss-simple-vars)插件提供变量提示及自动补全功能  

如使用[postcss-import](https://github.com/postcss/postcss-import)，通过@import引用的样式表及其上级的引用文件内定义的变量，均可获得提示  

若[postcss-import](https://github.com/postcss/postcss-import)定义了路径别名，则需要在settings中添加postcss-simple-vars-hint.alias配置，默认配置是

.vscode/settings
```
{
  "postcss-simple-vars-hint.alias": {
    "@/": "./src"
  }
}
```

## 示例
a.css
```
$color1: #fff;
```
b.css
```
@import './a.css'
$color2: #f00;
```
c.css
```
@import 'b.css'
```
在c.css文件中输入$时弹出的提示中包含$color1和$color2