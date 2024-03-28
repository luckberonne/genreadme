import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { env } from "process";


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

async function insertReadmeTemplate() {
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

    const template = await generateReadmeTemplate(files, packageJson);

    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const selection = editor.selection;
        const range = new vscode.Range(selection.start, selection.end);
        editor.edit(async editBuilder => {
            editBuilder.replace(range, template);
        });
    }
}

async function generateReadmeTemplate(files: string[], packageJson?: PackageJSON): Promise<string> {
	const genAI = new GoogleGenerativeAI(env.GEN_IA_API!);
	const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
    const generationConfig = {
        temperature: 0.9,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      };

      const safetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ];
	  const chat = model.startChat({
		generationConfig,
		safetySettings,
		history: [
		  {
			role: "user",
			parts: [{ text: "Quiero que a base de los siguientes datos generes un EXCELENTE readme"}],
		  },
		  {
			role: "model",
			parts: [{ text: "**Nombre del proyecto:** Proyecto Increíble\n\n**Descripción:**\n\nEl Proyecto Increíble es una iniciativa innovadora que aborda [propósito del proyecto]. Creemos que este proyecto tendrá un impacto significativo al [objetivo del proyecto].\n\n**Objetivos:**\n\n* Lograr [objetivo 1]\n* Conseguir [objetivo 2]\n* Facilitar [objetivo 3]\n\n**Público objetivo:**\n\n* [Público objetivo 1]\n* [Público objetivo 2]\n* [Público objetivo 3]\n\n**Tecnología:**\n\nEl proyecto utiliza las siguientes tecnologías:\n\n* [Tecnología 1]\n* [Tecnología 2]\n* [Tecnología 3]\n\n**Beneficios:**\n\nEl uso de este proyecto aportará los siguientes beneficios:\n\n* [Beneficio 1]\n* [Beneficio 2]\n* [Beneficio 3]\n\n**Cómo contribuir:**\n\nSomos una comunidad abierta y acogedora, y damos la bienvenida a todas las contribuciones. Puedes colaborar de las siguientes maneras:\n\n* [Método de contribución 1]\n* [Método de contribución 2]\n* [Método de contribución 3]\n\n**Documentación:**\n\n* [Enlace a la documentación del proyecto]\n\n**Contacto:**\n\nSi tienes alguna pregunta o comentario, no dudes en ponerte en contacto con nosotros en:\n\n* [Dirección de correo electrónico]\n* [Número de teléfono]\n* [Nombre de usuario de redes sociales]\n\n**Licencia:**\n\nEl Proyecto Increíble está licenciado bajo [nombre de licencia]."}],
		  },
		],
	  });
	
	  const result = await chat.sendMessage(`${files} ${packageJson}`);
	  const response = result.response;
	//   console.log(response.text());


    return response.text();
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
