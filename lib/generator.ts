import 'reflect-metadata';

import { Constructable, fieldsMetadataKey, IMappingOptions, JsonSerializable, mappingMetadataKey } from './interfaces';
import { Supplier, genFnMetadataKey, ITypeHint, typeHintMetadataKey, typeMetadataKey } from './internals';

interface GenerateValueParams {
    type: any;
    propMappingMetadata: IMappingOptions<any, any> | null;
    hint: ITypeHint<any> | null;
    genFn: Supplier<any> | null;
}

export class MockGenerator
{
    static ignoreWarnings = false;

    static generateMock<T extends JsonSerializable>(ctor: Constructable<T>, ignoreWarnings = false): T
    {
        MockGenerator.ignoreWarnings = ignoreWarnings;
        return MockGenerator.generateValue({ type: ctor, propMappingMetadata: { complexType: ctor }, hint: null, genFn: null });
    }

    private static generateComplexObject<T extends JsonSerializable>(ctor: Constructable<T>)
    {
        const target = new ctor();

        const fields: string[] = Reflect.getMetadata(fieldsMetadataKey, target);

        for(const field of fields)
        {
            const propMappingMetadata: IMappingOptions<any, any> | null = Reflect.getMetadata(mappingMetadataKey, target, field);
            const type = Reflect.getMetadata(typeMetadataKey, target, field);
            const hint: ITypeHint<any> | null = Reflect.getMetadata(typeHintMetadataKey, target, field) || null;
            const genFn: Supplier<T> | null = Reflect.getMetadata(genFnMetadataKey, target, field) || null;

            target[field] = MockGenerator.generateValue({ type, propMappingMetadata, hint, genFn });
        }

        return target;
    }

    private static generateValue({ type, propMappingMetadata, hint, genFn }: GenerateValueParams): any
    {
        if(genFn)
            return genFn();

        if(type === Object && hint?.hint)
            type = hint.hint;

        if(type === Array || propMappingMetadata?.isArray)
        {
            return MockGenerator.generateRandomArray(propMappingMetadata, hint);
        }
        else if(type === Object)
        {
            if(!MockGenerator.ignoreWarnings)
                console.warn('Object type without hint, it will be generated as {}');
            return {};
        }
        else if(type === String)
        {
            if(hint?.isEnum)
                return MockGenerator.randomEnum(hint);
            else
                return Math.random().toString();
        }
        else if(type === Number)
        {
            if(hint?.isEnum)
                return MockGenerator.randomEnum(hint);
            else
                return Math.random();
        }
        else if(type === Date)
            return new Date();
        else if(propMappingMetadata?.complexType)
            return MockGenerator.generateComplexObject(propMappingMetadata.complexType);
    }

    private static generateRandomArray(propMappingMetadata: IMappingOptions<any, any> | null, hint: ITypeHint<any> | null)
    {
        const array: Array<any> = [];
        const min = hint?.minArrayLength ?? 1;
        const max = hint?.maxArrayLength ?? 10;
        const length = Math.floor(Math.random() * (max - min + 1) + min);
        const arrayGenItemFn = (function()
        {
            if(propMappingMetadata?.complexType)
                return () => MockGenerator.generateComplexObject(propMappingMetadata.complexType!);
            else if(hint?.hint)
                return () => MockGenerator.generateMock(hint.hint);
            else if(!MockGenerator.ignoreWarnings)
                console.warn('Array type without hint, it will be generated empty');
        })();

        if(arrayGenItemFn)
            for(let i = 0; i < length; ++i)
                array.push(arrayGenItemFn());

        return array;
    }

    private static randomEnum(hint: ITypeHint<any>)
    {
        const keys = Object.keys(hint.hint).filter(x => isNaN(parseInt(x, 10)));
        const index = Math.floor(Math.random() * keys.length);
        return hint.hint[keys[index]];
    }
}

type Decorator = (target: Object, propertyKey: string | symbol) => void;

export function TypeHint<T>(hint: T): Decorator
{
    const settings: ITypeHint<T> = { hint };
    return overrideHint(settings);
}

export function EnumHint<T>(hint: T): Decorator
{
    const settings: ITypeHint<T> = { hint, isEnum: true };
    return overrideHint(settings);
}

export function ArrayHint<T>(max: number): Decorator;
// tslint:disable-next-line: unified-signatures
export function ArrayHint<T>(min: number, max: number): Decorator;
export function ArrayHint<T>(min: number, max: number = -1): Decorator
{
    let minArrayLength: number | undefined = min;
    let maxArrayLength: number | undefined = max;

    if(maxArrayLength < 0)
    {
        maxArrayLength = minArrayLength;
        minArrayLength = undefined;
    }

    return overrideHint<T>({
        maxArrayLength: maxArrayLength,
        minArrayLength: minArrayLength
    });
}

function overrideHint<T>(newSettings: Partial<ITypeHint<T>>): Decorator
{
    return function(target: Object, propertyKey: string | symbol)
    {
        const settings: ITypeHint<T> = Reflect.getMetadata(typeHintMetadataKey, target, propertyKey) || {};
        Reflect.defineMetadata(typeHintMetadataKey, {
            ...newSettings,
            ...settings
        }, target, propertyKey);
    };
}

export function Generator<T>(genFn: Supplier<T>)
{
    return Reflect.metadata(
        genFnMetadataKey,
        genFn
    );
}
