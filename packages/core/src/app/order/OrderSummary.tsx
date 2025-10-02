import {
    ExtensionRegion,
    type LineItemMap,
    type ShopperCurrency,
    type StoreCurrency,
} from '@bigcommerce/checkout-sdk';
import React, { type FunctionComponent, type ReactNode, useMemo } from 'react';

import { Extension } from '@bigcommerce/checkout/checkout-extension';
import { useThemeContext } from '@bigcommerce/checkout/ui';

import OrderSummaryHeader from './OrderSummaryHeader';
import OrderSummaryItems from './OrderSummaryItems';
import OrderSummarySection from './OrderSummarySection';
import OrderSummarySubtotals, { type OrderSummarySubtotalsProps } from './OrderSummarySubtotals';
import OrderSummaryTotal from './OrderSummaryTotal';
import removeBundledItems from './removeBundledItems';

export interface OrderSummaryProps {
    lineItems: LineItemMap;
    total: number;
    headerLink: ReactNode;
    storeCurrency: StoreCurrency;
    shopperCurrency: ShopperCurrency;
    additionalLineItems?: ReactNode;
}

const OrderSummary: FunctionComponent<OrderSummaryProps & OrderSummarySubtotalsProps> = ({
    isTaxIncluded,
    taxes,
    storeCurrency,
    shopperCurrency,
    headerLink,
    additionalLineItems,
    lineItems,
    total,
    ...orderSummarySubtotalsProps
}) => {
    const nonBundledLineItems = useMemo(() => removeBundledItems(lineItems), [lineItems]);

    const isReorder = 
        lineItems.physicalItems.some(x => x.sku.startsWith('SPARE'));

    const { themeV2 } = useThemeContext();

    return (
        <article className="cart optimizedCheckout-orderSummary" data-test="cart">
            <OrderSummaryHeader>{headerLink}</OrderSummaryHeader>

            <OrderSummarySection>
                <OrderSummaryItems displayLineItemsCount items={nonBundledLineItems} themeV2={themeV2} />
            </OrderSummarySection>

            <Extension region={ExtensionRegion.SummaryLastItemAfter} />

            <OrderSummarySection>
                <OrderSummarySubtotals isTaxIncluded={isTaxIncluded} taxes={taxes} isReorder={isReorder} {...orderSummarySubtotalsProps} />
                {additionalLineItems}
            </OrderSummarySection>

            <OrderSummarySection>
                <OrderSummaryTotal
                    orderAmount={total}
                    shopperCurrencyCode={shopperCurrency.code}
                    storeCurrencyCode={storeCurrency.code}
                />
                {shopperCurrency.code !== 'AUD' && (
                    <p>Pay in Full or Spread the cost with our payment options</p>
                )}
            </OrderSummarySection>
        </article>
    );
};

export default OrderSummary;
