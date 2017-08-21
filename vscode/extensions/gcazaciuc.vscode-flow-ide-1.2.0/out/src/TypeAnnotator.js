"use strict";
const http = require('http');
const R = require('recast');
const flowParser = require('flow-parser');
const fs = require('fs');
const _ = require('lodash');
const vscode = require('vscode');
const beautify = require('js-beautify').js_beautify;
const hash = require('murmurhash-js/murmurhash3_gc');
const generateLocationHash = (filename, node) => {
    if (!node.loc) {
        return undefined;
    }
    return hash(filename + node.loc.start.line + node.loc.start.column + node.loc.end.line + node.loc.end.column);
};
const readReqBody = (req, callback) => {
    let body = [];
    req.on('data', function (chunk) {
        body.push(chunk);
    }).on('end', function () {
        const reqBodyStr = Buffer.concat(body).toString();
        if (reqBodyStr) {
            callback(JSON.parse(reqBodyStr));
        }
        else {
            callback({});
        }
    });
};
class TypeAnnotator {
    constructor() {
        this._server = null;
        this._types = {};
        this._typeAliases = [];
    }
    static getInstance() {
        if (TypeAnnotator._instance === null) {
            TypeAnnotator._instance = new TypeAnnotator();
        }
        return TypeAnnotator._instance;
    }
    _handleCors(req, res) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Request-Method', '*');
        res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
        res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return true;
        }
        return false;
    }
    _mergeTypesData(incomingData) {
        Object.keys(incomingData).forEach((filename) => {
            const fileData = this._types[filename];
            if (!fileData) {
                this._types[filename] = incomingData[filename];
                return;
            }
            Object.keys(incomingData[filename]).forEach((fnId) => {
                const fnData = incomingData[filename][fnId];
                this._types[filename][fnId] = this._types[filename][fnId] || [];
                this._types[filename][fnId] = this._types[filename][fnId].concat(fnData);
            });
        });
    }
    setSubscriptions(subs) {
        const that = this;
        subs.push({
            dispose: () => that._server && that._server.close()
        });
    }
    getTypes() {
        return this._types;
    }
    start() {
        const that = this;
        if (this._server === null) {
            this._server = http.createServer((req, res) => {
                const isCorsReq = that._handleCors(req, res);
                if (isCorsReq) {
                    return;
                }
                try {
                    readReqBody(req, function (data) {
                        that._mergeTypesData(data.types);
                        console.log('Type aliases:' + JSON.stringify(data.aliases));
                        res.writeHead(200, { "Content-Type": 'application/json' });
                        res.write(JSON.stringify({ "ok": true }));
                        res.end();
                    });
                }
                catch (e) {
                    console.log('Exception occured:' + e);
                    that.stop();
                }
            });
            that._server.listen(3100);
        }
    }
    stop() {
        if (this._server) {
            this._server.close();
        }
        this._server = null;
    }
    _getParamsByGroup(annotations) {
        const groupedByParams = _.groupBy(annotations, 'paramIdx');
        Object.keys(groupedByParams).forEach((paramIdx) => {
            groupedByParams[paramIdx] = _.map(groupedByParams[paramIdx], 'type');
        });
        return groupedByParams;
    }
    _unifyGenericAnnotations(genericAnnotations) {
        const b = R.types.builders;
        const groupedByName = _.groupBy(genericAnnotations, (item) => {
            if (item.id.type === 'Identifier') {
                return item.id.name;
            }
            if (item.id.type === 'QualifiedTypeIdentifier') {
                return `${item.id.qualification.name}.${item.id.id.name}`;
            }
        });
        const unifiedAnnotations = Object.keys(groupedByName).map((annotName) => {
            const typeParams = _.map(groupedByName[annotName], (a) => a.typeParameters && a.typeParameters.params[0]);
            const unifiedTypeParams = this._getAnnotationAST(this._unify(typeParams));
            const typeParamsInst = unifiedTypeParams ? b.typeParameterInstantiation([unifiedTypeParams]) : null;
            const splitAnnotName = annotName.split('.');
            let annotIdent = null;
            if (splitAnnotName.length > 1) {
                annotIdent = b.qualifiedTypeIdentifier(b.identifier(splitAnnotName[0]), b.identifier(splitAnnotName[1]));
            }
            else {
                annotIdent = b.identifier(annotName);
            }
            return b.genericTypeAnnotation(annotIdent, typeParamsInst);
        });
        if (unifiedAnnotations.length === 1) {
            return unifiedAnnotations[0];
        }
        return b.unionTypeAnnotation(unifiedAnnotations);
    }
    _unifyObjectAnnotations(objAnnotations) {
        const knownKeys = {};
        const b = R.types.builders;
        objAnnotations.forEach((a) => {
            a.properties.forEach((prop) => {
                if (prop.key.type === 'Identifier') {
                    knownKeys[prop.key.name] = knownKeys[prop.key.name] || [];
                    knownKeys[prop.key.name].push(prop.value);
                }
            });
        });
        const objProp = Object.keys(knownKeys).map((k) => {
            return b.objectTypeProperty(b.identifier(k), this._getAnnotationAST(this._unify(knownKeys[k])), knownKeys.length === objAnnotations.length);
        });
        return b.objectTypeAnnotation(objProp);
    }
    _collapseAnnotations(annotations) {
        const b = R.types.builders;
        const groupedAnnotations = _.groupBy(annotations, 'type');
        const unifiedAnnotations = Object.keys(groupedAnnotations).map((type) => {
            switch (type) {
                case 'ObjectTypeAnnotation':
                    return this._unifyObjectAnnotations(groupedAnnotations[type]);
                case 'GenericTypeAnnotation':
                    return this._unifyGenericAnnotations(groupedAnnotations[type]);
                default:
                    return groupedAnnotations[type][0];
            }
        });
        if (unifiedAnnotations.length === 1) {
            return unifiedAnnotations[0];
        }
        return b.unionTypeAnnotation(unifiedAnnotations);
    }
    _unify(annotatations) {
        // Put here the logic to collapse types into one
        const annotToUnify = [].concat(annotatations);
        const annotAST = annotToUnify.map(this._getAnnotationAST);
        const unifiedAnnot = this._collapseAnnotations(annotAST);
        if (unifiedAnnot) {
            return R.print(unifiedAnnot, { quote: 'single' }).code;
        }
        return null;
    }
    _postProcessTypes(unifiedAnnot, propName = '') {
        if (unifiedAnnot) {
            return this._createTypeAliases(unifiedAnnot, propName);
        }
        return null;
    }
    _editText(editor, text) {
        editor.edit(builder => {
            const document = editor.document;
            const lastLine = document.lineAt(document.lineCount - 2);
            const start = new vscode.Position(0, 0);
            const end = new vscode.Position(document.lineCount - 1, lastLine.text.length);
            builder.replace(new vscode.Range(start, end), text);
        });
    }
    _getAnnotationAST(annotation) {
        if (!annotation) {
            return null;
        }
        if (typeof annotation !== 'string') {
            return annotation;
        }
        const annotAst = R.parse(`type a = ${annotation}`, { parser: flowParser });
        return annotAst.program.body[0].right;
    }
    _hashAnnotation(annotationAst) {
        return hash(R.print(annotationAst, { quote: 'single' }).code);
    }
    _hasTypeAlias(hash) {
        return this._typeAliases.find((alias) => alias.hash === hash);
    }
    _createAlias(typeAliasName, annotHash, annotAst) {
        const b = R.types.builders;
        const typeAliasCounter = this._typeAliases.length;
        const typeAliasNameExists = this._typeAliases.find((t) => t.typeAliasName === typeAliasName);
        let createdAliasName = typeAliasName;
        if (typeAliasNameExists) {
            createdAliasName += typeAliasCounter;
        }
        this._typeAliases.push({
            hash: annotHash,
            typeAliasName: createdAliasName,
            ast: b.typeAlias(b.identifier(createdAliasName), null, annotAst)
        });
        return b.genericTypeAnnotation(b.identifier(createdAliasName), null);
    }
    _createTypeAliases(annotAst, name = '') {
        const b = R.types.builders;
        const typeAliasCounter = this._typeAliases.length;
        const aliasName = name ? `${name}Type` : `Alias${typeAliasCounter}Type`;
        const typeAliasName = _.upperFirst(_.camelCase(aliasName));
        const annotHash = this._hashAnnotation(annotAst);
        const hasTypeAlias = this._hasTypeAlias(annotHash);
        if (hasTypeAlias) {
            return b.genericTypeAnnotation(b.identifier(hasTypeAlias.typeAliasName), null);
        }
        if (annotAst.type === 'ObjectTypeAnnotation') {
            annotAst.properties = annotAst.properties.map((annotProp) => {
                annotProp.value = this._createTypeAliases(annotProp.value, annotProp.key ? annotProp.key.name : '');
                return annotProp;
            });
            return this._createAlias(typeAliasName, annotHash, annotAst);
        }
        if (annotAst.type === 'GenericTypeAnnotation' && annotAst.typeParameters) {
            annotAst.typeParameters.params = annotAst.typeParameters.params.map((annotProp) => {
                return this._createTypeAliases(annotProp, annotProp.key ? annotProp.key.name : name);
            });
        }
        if (annotAst.type === 'UnionTypeAnnotation' || annotAst.type === 'IntersectionTypeAnnotation') {
            annotAst.types = annotAst.types.map((annotProp) => {
                return this._createTypeAliases(annotProp, annotProp.key ? annotProp.key.name : name);
            });
        }
        return annotAst;
    }
    _extractAnnotationsForParam(paramIdx, fileTypes, classHash) {
        let classAnnotations = [];
        Object.keys(fileTypes).forEach((k) => {
            fileTypes[k].filter((o) => o.classHash === classHash && o.paramIdx === paramIdx).forEach((annot) => {
                classAnnotations = classAnnotations.concat(annot);
            });
        });
        return classAnnotations;
    }
    _extractClassProperties(path, includeStatics) {
        let classProperties = {};
        path.node.body.body.forEach((classProp) => {
            if (classProp.type === 'ClassProperty' &&
                classProp.key.type === 'Identifier' &&
                classProp.static === includeStatics) {
                classProperties[classProp.key.name] = classProp;
            }
        });
        return classProperties;
    }
    _annotateClassProperties(path, paramIdx, fileTypes, classHash, reactClass) {
        let classAnnotations = this._extractAnnotationsForParam(paramIdx, fileTypes, classHash);
        const classProperties = this._extractClassProperties(path, paramIdx === -2);
        const isReactClass = (paramIdx === -1 && classProperties['_reactInternalInstance']) || reactClass;
        let excludedProps = paramIdx === -1 ? ['_reactInternalInstance', 'updater', 'refs', 'context'] : ['contextTypes', 'propTypes'];
        if (!isReactClass) {
            excludedProps = [];
        }
        excludedProps.forEach((exclProp) => {
            delete classProperties[exclProp];
        });
        if (classAnnotations.length) {
            const groupedAnnotation = this._getParamsByGroup(classAnnotations);
            const finalAnnot = this._getAnnotationAST(this._unify(groupedAnnotation[paramIdx]));
            if (finalAnnot) {
                const b = R.types.builders;
                // Annotate each class property
                if (finalAnnot.type === 'ObjectTypeAnnotation') {
                    finalAnnot.properties.forEach((prop) => {
                        if (prop.key.type === 'Identifier' && excludedProps.indexOf(prop.key.name) === -1) {
                            if (!classProperties[prop.key.name]) {
                                classProperties[prop.key.name] = b.classProperty(prop.key, null, b.typeAnnotation(this._postProcessTypes(prop.value, prop.key.name)));
                                classProperties[prop.key.name].static = (paramIdx === -2);
                            }
                            if (!classProperties[prop.key.name].typeAnnotation) {
                                classProperties[prop.key.name].typeAnnotation = b.typeAnnotation(this._postProcessTypes(prop.value, prop.key.name));
                            }
                        }
                    });
                }
            }
        }
        return classProperties;
    }
    addTypes() {
        const activeEditor = vscode.window.activeTextEditor;
        this._typeAliases = [];
        if (!activeEditor) {
            return;
        }
        const filename = activeEditor.document.uri.fsPath;
        const content = String(fs.readFileSync(filename));
        const fileTypes = this._types[filename];
        const b = R.types.builders;
        const that = this;
        if (!fileTypes) {
            // Also show an error message to the user
            return;
        }
        const fileAst = R.parse(content, { parser: flowParser });
        const addClassAnnotations = function (path) {
            const classHash = generateLocationHash(filename, path.node);
            const classProperties = that._annotateClassProperties(path, -1, fileTypes, classHash);
            const isReactClass = !!classProperties['_reactInternalInstance'];
            let classStaticsProperties = that._annotateClassProperties(path, -2, fileTypes, classHash, isReactClass);
            const classMethods = path.node.body.body.filter((clsP) => clsP.type !== 'ClassProperty');
            const classProps = Object.keys(classProperties).filter((k) => {
                const reactPropsToOmit = ['_reactInternalInstance', 'updater', 'refs', 'context'];
                if (isReactClass) {
                    return reactPropsToOmit.indexOf(k) === -1;
                }
                return true;
            }).map((k) => classProperties[k]);
            path.node.body.body = classProps.concat(Object.keys(classStaticsProperties).map((k) => classStaticsProperties[k]), classMethods);
            if (isReactClass && !path.node.superTypeParameters) {
                const dpAnnot = classStaticsProperties['defaultProps'] ? classStaticsProperties['defaultProps'].typeAnnotation.typeAnnotation : b.voidTypeAnnotation();
                const pAnnot = classProperties['props'] ? classProperties['props'].typeAnnotation.typeAnnotation : b.voidTypeAnnotation();
                const sAnnot = classProperties['state'] ? classProperties['state'].typeAnnotation.typeAnnotation : b.voidTypeAnnotation();
                path.node.superTypeParameters = b.typeParameterInstantiation([
                    dpAnnot,
                    pAnnot,
                    sAnnot
                ]);
            }
            this.traverse(path);
        };
        const addAnnotations = function (path) {
            const locHash = generateLocationHash(filename, path.node.body);
            if (locHash && fileTypes[locHash]) {
                const groupedAnnotation = that._getParamsByGroup(fileTypes[locHash]);
                path.node.params.forEach((par, idx) => {
                    const annotation = groupedAnnotation[idx];
                    const unifiedAnnot = that._unify(annotation);
                    const annotAst = that._getAnnotationAST(unifiedAnnot);
                    let param = par;
                    if (par.type === 'AssignmentPattern' && par.left.type === 'Identifier') {
                        param = par.left;
                    }
                    const paramName = param.type === 'Identifier' ? param.name : '';
                    const finalAnnotation = that._postProcessTypes(annotAst, paramName);
                    if (finalAnnotation && !param.typeAnnotation) {
                        param.typeAnnotation = b.typeAnnotation(finalAnnotation);
                    }
                });
            }
            this.traverse(path);
        };
        R.types.visit(fileAst, {
            visitFunctionExpression: addAnnotations,
            visitFunctionDeclaration: addAnnotations,
            visitArrowFunctionExpression: addAnnotations,
            visitClassDeclaration: addClassAnnotations
        });
        const tempAst = R.parse('', { parser: flowParser });
        this._typeAliases.reverse().forEach((ta) => {
            const aliasAst = ta.ast;
            tempAst.program.body.unshift(aliasAst);
        });
        const firstNode = fileAst.program.body[0];
        const typeAliasInsert = fileAst.program.body.findIndex((c) => c.type !== 'ImportDeclaration');
        const typeAliasMarker = '---typeAliasSection---';
        fileAst.program.body.splice(typeAliasInsert, 0, b.expressionStatement(b.stringLiteral(typeAliasMarker)));
        if (firstNode) {
            const comments = firstNode.comments || [];
            const flowComment = comments.find((c) => c.value.trim() === '@flow');
            if (!flowComment) {
                comments.unshift(b.commentLine(' @flow'));
                firstNode.comments = comments;
            }
        }
        const newContent = R.print(fileAst, { quote: 'single' }).code;
        const typeAliasContent = R.print(tempAst, { quote: 'single' }).code;
        const beautifiedAliasContent = beautify(typeAliasContent, { indent_size: 4 });
        this._editText(activeEditor, newContent.replace("'" + typeAliasMarker + "';", beautifiedAliasContent));
    }
}
TypeAnnotator._instance = null;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TypeAnnotator;
//# sourceMappingURL=TypeAnnotator.js.map