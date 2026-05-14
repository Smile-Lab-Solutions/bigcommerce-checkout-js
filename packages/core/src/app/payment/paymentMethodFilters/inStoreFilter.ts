import { type PaymentMethodFilter } from '@bigcommerce/checkout/payment-integration-api';

export const inStoreFilter: PaymentMethodFilter = {
    name: 'inStore',
    apply(methods) {
        return methods.filter((method) => {
            // Remove In Store as this payment method
            //  is only for checking custom payment merchant integration
            if (method.id === 'instore') {
                return false;
            }

            return true;
        });
    },
};
