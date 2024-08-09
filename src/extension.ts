import * as vscode from 'vscode';
import path from 'path';
import fs from 'fs';

const { languages } = vscode;

// 递归解析引入的css文件，返回其中定义的变量
const parseCss = (
  document:vscode.TextDocument,
  uri:string
) => {
  // 获取工作区的路径
  const folder = vscode.workspace.getWorkspaceFolder(document.uri)
  // 获取设置
  const settings = vscode.workspace.getConfiguration('postcss-simple-vars-hint', folder)
  const alias:{[key:string]:string} = settings.get('alias')??{}
  // 获取编码格式
  const encoding = vscode.workspace.getConfiguration('css').get<BufferEncoding>('encoding', 'utf-8')
  // 获取文件文本内容
  const text = fs.readFileSync(uri, encoding)
  // 获取变量(以$开头，中间有:，以;或者换行符结尾的字符串，去掉末尾换行符和分号)
  let vars = (text.match(/(\$|--)[^;\n]+:[^;\n]+(\n|;)/g)??[]).reduce((obj, v) => {
    const arr = v.replace(/(\n|;)$/, '').replace(/\s+/g, '').split(':')
    obj[arr[0]] = arr[1]
    return obj
  }, {} as {[variable:string]:string})
  // 获取所有的导入路径
  const importPaths = text.match(/@import\s+['"]([^'"]+\.[^'"]+)['"]/g)
  importPaths?.forEach((v) => {
    // 获取完整的路径
    let filePath = v.replace(/@import\s+/, '')
    filePath = filePath.substring(1, filePath.length - 1)
    // 新建正则规则
    const reg = new RegExp(`(${Object.keys(alias).join('|')})`)
    let fullPath = filePath.replace(reg, (match:string) => {
      return path.join(folder!.uri.fsPath, alias[match])
    })
    // 判断路径是相对路径还是绝对路径
    if (!path.isAbsolute(fullPath)) {
      fullPath = path.join(path.dirname(document.uri.fsPath), fullPath)
    }
    if (!fs.existsSync(fullPath)) {
      return
    }
    return vars = { ...parseCss(document, fullPath), ...vars }
  })
  return vars
}

// 生成自动补全的选项
const provideCompletionItems = (
  document: vscode.TextDocument,
  position: vscode.Position
): vscode.CompletionItem[] => {
  // 获取前一个字符(前一个字符是$补全时不添加$符号)
  const preChart = document.getText(new vscode.Range(position.translate(0, -1), position))
  // 当前文件及通过@import引入文件内的全部变量
  const vars = parseCss(document, document.uri.fsPath)
  // 当前光标后面的文本
  const afterText = document.getText(new vscode.Range(position, document.lineAt(position.line).range.end))
  // 判断当前光标后面是否存在分号(填充时会自动替换当前行光标至后面第一个分号间的全部内容)
  const hasSemicolon = afterText.indexOf(';') > -1
  const getColor = (color:string):string => {
    if(/var(.+)/.test(color)) {
      color = color.replace('var(', '').replace(')', '')
    }
    if(vars[color]) {
      color = getColor(vars[color])
    }
    return color
  }
  return Object.entries(vars).filter(([key]) => key.startsWith('$')).map(([variable, color]) => {
    // 获取变量名称及颜色
    return {
      label: {
        label: variable,
        description: color
      },
      // 自动补全选项图标类型
      kind: vscode.CompletionItemKind.Color,
      // 图标详情
      detail: getColor(color),
      // 插入内容
      insertText: (preChart === '$' ? variable.replace('$', '') : variable) + (hasSemicolon ? '' : ';')
    }
  })
}

/**
 * 给css文件提供已$开头变量自动补全功能的扩展
 * 需要先在package.json中添加配置
 * languageId 自定义的language类型扩展的id
  "activationEvents": [
    "onLanguage:languageId"
  ],
  "contributes": {
    "languages": [{
      "id": "languageId",
      "extensions": [".css", ".pcss"],
      "filenames": ["*.css", "*.pcss"]
    }]
  },
 */
export function activate(context: vscode.ExtensionContext) {
	const disposable = languages.registerCompletionItemProvider('css', {
    provideCompletionItems,
    // resolveCompletionItem
  }, '$')
	context.subscriptions.push(disposable);
}

export function deactivate() {}
