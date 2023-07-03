import {
    Address,
    CheckoutSelectors,
    Country,
    Customer,
    FormField,
} from '@bigcommerce/checkout-sdk';
import { FormikProps, withFormik } from 'formik';
import React, { createRef, PureComponent, ReactNode, RefObject } from 'react';
import { lazy } from 'yup';

import { TranslatedString, withLanguage, WithLanguageProps } from '@bigcommerce/checkout/locale';
import { AddressFormSkeleton } from '@bigcommerce/checkout/ui';

import {
    AddressForm,
    AddressFormValues,
    AddressSelect,
    getAddressFormFieldsValidationSchema,
    getTranslateAddressError,
    isValidCustomerAddress,
    mapAddressToFormValues,
} from '../address';
import { getCustomFormFieldsValidationSchema } from '../formFields';
import { OrderComments } from '../orderComments';
import { Button, ButtonVariant } from '../ui/button';
import { Fieldset, Form } from '../ui/form';
import { LoadingOverlay } from '../ui/loading';

import StaticBillingAddress from './StaticBillingAddress';

export type BillingFormValues = AddressFormValues & { orderComment: string };

export interface BillingFormProps {
    billingAddress?: Address;
    countries: Country[];
    countriesWithAutocomplete: string[];
    customer: Customer;
    customerMessage: string;
    googleMapsApiKey: string;
    isUpdating: boolean;
    methodId?: string;
    shouldShowOrderComments: boolean;
    isFloatingLabelEnabled?: boolean;
    getFields(countryCode?: string): FormField[];
    onSubmit(values: BillingFormValues): void;
    onUnhandledError(error: Error): void;
    updateAddress(address: Partial<Address>): Promise<CheckoutSelectors>;
    storeCurrencyCode: string;
}

interface BillingFormState {
    isResettingAddress: boolean;
}

class BillingForm extends PureComponent<
    BillingFormProps & WithLanguageProps & FormikProps<BillingFormValues>,
    BillingFormState
> {
    state: BillingFormState = {
        isResettingAddress: false,
    };

    private addressFormRef: RefObject<HTMLFieldSetElement> = createRef();

    render(): ReactNode {
        const {
            googleMapsApiKey,
            billingAddress,
            countriesWithAutocomplete,
            customer: { addresses, isGuest },
            getFields,
            countries,
            isUpdating,
            setFieldValue,
            shouldShowOrderComments,
            values,
            methodId,
            storeCurrencyCode,
            isFloatingLabelEnabled,
        } = this.props;

        const shouldRenderStaticAddress = methodId === 'amazonpay';
        const allFormFields = getFields(values.countryCode);
        const customFormFields = allFormFields.filter(({ custom }) => custom);
        const hasCustomFormFields = customFormFields.length > 0;
        const editableFormFields =
            shouldRenderStaticAddress && hasCustomFormFields ? customFormFields : allFormFields;
        const { isResettingAddress } = this.state;
        const hasAddresses = addresses && addresses.length > 0;
        const hasValidCustomerAddress =
            billingAddress &&
            isValidCustomerAddress(
                billingAddress,
                addresses,
                getFields(billingAddress.countryCode),
            );

            if (editableFormFields.length > 0){
                // Remove company field
                const companyIndex = editableFormFields.findIndex(x => x.name === 'company');
                if (companyIndex > 0){
                    editableFormFields.splice(companyIndex, 1);
                }

                // Only remove state/province for countries except US
                if (values.countryCode !== 'US'){
                    const stateOrProvinceIndex = editableFormFields.findIndex(x => x.name === 'stateOrProvince');
                    if (stateOrProvinceIndex > 0){
                        editableFormFields.splice(stateOrProvinceIndex, 1);
                    }
                }
            }

        return (
            <Form autoComplete="on">
                {shouldRenderStaticAddress && billingAddress && (
                    <div className="form-fieldset">
                        <StaticBillingAddress address={billingAddress} />
                    </div>
                )}

                <Fieldset id="checkoutBillingAddress" ref={this.addressFormRef}>
                    {hasAddresses && !shouldRenderStaticAddress && (
                        <Fieldset id="billingAddresses">
                            <LoadingOverlay isLoading={isResettingAddress}>
                                <AddressSelect
                                    addresses={addresses}
                                    onSelectAddress={this.handleSelectAddress}
                                    onUseNewAddress={this.handleUseNewAddress}
                                    selectedAddress={
                                        hasValidCustomerAddress ? billingAddress : undefined
                                    }
                                />
                            </LoadingOverlay>
                        </Fieldset>
                    )}

                    {!hasValidCustomerAddress && (
                        <AddressFormSkeleton isLoading={isResettingAddress}>
                            <AddressForm
                                countries={countries}
                                countriesWithAutocomplete={countriesWithAutocomplete}
                                countryCode={values.countryCode}
                                formFields={editableFormFields}
                                googleMapsApiKey={googleMapsApiKey}
                                isFloatingLabelEnabled={isFloatingLabelEnabled}
                                setFieldValue={setFieldValue}
                                shouldShowSaveAddress={!isGuest}
                                storeCurrencyCode={storeCurrencyCode}
                            />
                        </AddressFormSkeleton>
                    )}
                </Fieldset>

                {shouldShowOrderComments && <OrderComments />}

                <div className="form-actions">
                    <Button
                        disabled={isUpdating || isResettingAddress}
                        id="checkout-billing-continue"
                        isLoading={isUpdating || isResettingAddress}
                        type="submit"
                        variant={ButtonVariant.Primary}
                    >
                        <TranslatedString id="common.continue_action" />
                    </Button>
                </div>
            </Form>
        );
    }

    private handleSelectAddress: (address: Partial<Address>) => void = async (address) => {
        const { updateAddress, onUnhandledError } = this.props;

        this.setState({ isResettingAddress: true });

        try {
            await updateAddress(address);
        } catch (error) {
            if (error instanceof Error) {
                onUnhandledError(error);
            }
        } finally {
            this.setState({ isResettingAddress: false });
        }
    };

    private handleUseNewAddress: () => void = () => {
        this.handleSelectAddress({});
    };
}

export default withLanguage(
    withFormik<BillingFormProps & WithLanguageProps, BillingFormValues>({
        handleSubmit: (values, { props: { onSubmit } }) => {
            onSubmit(values);
        },
        mapPropsToValues: ({ getFields, customerMessage, billingAddress }) => ({
            ...mapAddressToFormValues(
                getFields(billingAddress && billingAddress.countryCode),
                billingAddress,
            ),
            orderComment: customerMessage,
        }),
        isInitialValid: ({ billingAddress, getFields, language }) =>
            !!billingAddress &&
            getAddressFormFieldsValidationSchema({
                language,
                formFields: getFields(billingAddress.countryCode),
                countryCode: billingAddress.countryCode,
            }).isValidSync(billingAddress),
        validationSchema: ({
            language,
            getFields,
            methodId,
        }: BillingFormProps & WithLanguageProps) =>
            methodId === 'amazonpay'
                ? lazy<Partial<AddressFormValues>>((values) =>
                      getCustomFormFieldsValidationSchema({
                          translate: getTranslateAddressError(language),
                          formFields: getFields(values && values.countryCode),
                      }),
                  )
                : lazy<Partial<AddressFormValues>>((values) =>
                      getAddressFormFieldsValidationSchema({
                          language,
                          formFields: getFields(values && values.countryCode),
                          countryCode: values.countryCode,
                      }),
                  ),
        enableReinitialize: true,
    })(BillingForm),
);
