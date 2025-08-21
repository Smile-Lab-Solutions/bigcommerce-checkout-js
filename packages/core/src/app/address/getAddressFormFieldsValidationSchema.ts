import { FormField, LanguageService } from '@bigcommerce/checkout-sdk';
import { memoize } from 'lodash';
import { ObjectSchema } from 'yup';

import {
    FormFieldValues,
    getFormFieldsValidationSchema,
    TranslateValidationErrorFunction,
} from '../formFields';

export interface AddressFormFieldsValidationSchemaOptions {
    formFields: FormField[];
    language?: LanguageService;
    countryCode?: String;
}

export function getTranslateAddressError(
    language?: LanguageService,
    countryCode?: String,
): TranslateValidationErrorFunction {
    const requiredFieldErrorTranslationIds: { [fieldName: string]: string } = {
        countryCode: 'address.country',
        firstName: 'address.first_name',
        lastName: 'address.last_name',
        company: 'address.company_name',
        address1: 'address.address_line_1',
        address2: 'address.address_line_2',
        city: 'address.city',
        stateOrProvince: 'address.state',
        stateOrProvinceCode: 'address.state',
        postalCode: 'address.postal_code',
        phone: 'address.phone_number',
    };

    return (type, { label, name, min, max }) => {
        if (!language) {
            return;
        }

        if (type === 'required') {
            if (requiredFieldErrorTranslationIds[name]) {
                var translationKey = `${requiredFieldErrorTranslationIds[name]}_required_error`;

                if ((name === 'postalCode' || name === 'phone') && countryCode === 'US'){
                    translationKey = `${requiredFieldErrorTranslationIds[name]}_us_required_error`;
                }

                return language.translate(
                    translationKey
                );
            }

            return language.translate(`address.custom_required_error`, { label });
        }

        if (type === 'max' && max) {
            return language.translate(`address.custom_max_error`, { label, max });
        }

        if (type === 'min' && min) {
            return language.translate(`address.custom_min_error`, { label, min });
        }

        if (type === 'invalid') {
            return language.translate(`address.invalid_characters_error`, { label });
        }
    };
}

export default memoize(function getAddressFormFieldsValidationSchema({
    formFields,
    language,
    countryCode,
}: AddressFormFieldsValidationSchemaOptions): ObjectSchema<FormFieldValues> {
    return getFormFieldsValidationSchema({
        formFields,
        translate: getTranslateAddressError(language, countryCode),
    });
});
