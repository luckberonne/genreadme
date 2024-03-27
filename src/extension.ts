import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface PackageJSON {
    name: string;
    description?: string;
    dependencies?: { [key: string]: string };
    devDependencies?: { [key: string]: string };
}

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.insertReadmeTemplate', () => {
        insertReadmeTemplate();
    });

    context.subscriptions.push(disposable);
}

function insertReadmeTemplate() {
    const rootPath = vscode.workspace.rootPath;
    if (!rootPath) {
        vscode.window.showErrorMessage('No se ha encontrado un proyecto abierto.');
        return;
    }

    const files = getProjectFiles(rootPath);
    const packageJson = getPackageJson(rootPath);
    
    if (files.length === 0) {
        vscode.window.showInformationMessage('El proyecto no contiene archivos.');
        return;
    }

    const template = generateReadmeTemplate(files, packageJson);

    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const selection = editor.selection;
        const range = new vscode.Range(selection.start, selection.end);
        editor.edit(editBuilder => {
            editBuilder.replace(range, template);
        });
    }
}

function generateReadmeTemplate(files: string[], packageJson?: PackageJSON): string {
    let template = `# Título del Proyecto

`;

    if (packageJson) {
        template += `Nombre del Proyecto: ${packageJson.name}\n`;
        if (packageJson.description) {
            template += `Descripción: ${packageJson.description}\n`;
        }
        if (packageJson.dependencies) {
            template += '\n## Dependencias\n';
            for (const [dependency, version] of Object.entries(packageJson.dependencies)) {
                template += `- ${dependency}: ${version}\n`;
            }
        }
        if (packageJson.devDependencies) {
            template += '\n## Dependencias de Desarrollo\n';
            for (const [dependency, version] of Object.entries(packageJson.devDependencies)) {
                template += `- ${dependency}: ${version}\n`;
            }
        }
        template += '\n';
    }

    template += '## Lista de archivos del proyecto\n';
    template += files.map(file => `- ${file}`).join('\n');

    template += `\n
## Empezando

Instrucciones para empezar con el proyecto

## Instalación

Pasos para instalar el proyecto

## Uso

Ejemplos de uso y capturas de pantalla

## Contribuyendo

Instrucciones para contribuir al proyecto

## Licencia

Este proyecto está bajo la Licencia (nombre de la licencia) - ver el archivo [LICENSE.md](LICENSE.md) para detalles`;

    return template;
}

function getProjectFiles(rootPath: string): string[] {
    let files: string[] = [];
    const gitIgnorePath = path.join(rootPath, '.gitignore');
    let ignorePatterns: string[] = [];
    
    if (fs.existsSync(gitIgnorePath)) {
        const gitIgnoreContent = fs.readFileSync(gitIgnorePath, 'utf-8');
        ignorePatterns = gitIgnoreContent.split('\n').map(line => line.trim()).filter(line => !!line && !line.startsWith('#'));
    }
    
    const traverseDirectory = (dir: string) => {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
            const fullPath = path.join(dir, entry);
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
                traverseDirectory(fullPath);
            } else {
                const relativePath = fullPath.substring(rootPath.length + 1);
                if (!ignorePatterns.some(pattern => new RegExp(pattern).test(relativePath))) {
                    files.push(relativePath);
                }
            }
        }
    };
    traverseDirectory(rootPath);
    return files;
}

function getPackageJson(rootPath: string): PackageJSON | undefined {
    const packageJsonPath = path.join(rootPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
        return JSON.parse(packageJsonContent);
    }
    return undefined;
}
