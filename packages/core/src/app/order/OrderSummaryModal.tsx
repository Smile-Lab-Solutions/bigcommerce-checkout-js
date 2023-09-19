import {
    LineItemMap,
    ShopperCurrency as ShopperCurrencyType,
    StoreCurrency,
} from '@bigcommerce/checkout-sdk';
import React, { cloneElement, FunctionComponent, isValidElement, ReactNode } from 'react';

import { TranslatedString } from '@bigcommerce/checkout/locale';
import { Button, IconCloseWithBorder } from '@bigcommerce/checkout/ui';

import { preventDefault } from '../common/dom';
import { ShopperCurrency } from '../currency';
import { IconClose } from '../ui/icon';
import { Modal, ModalHeader } from '../ui/modal';
import { isSmallScreen } from '../ui/responsive';

import OrderModalSummarySubheader from './OrderModalSummarySubheader';
import OrderSummaryItems from './OrderSummaryItems';
import OrderSummarySection from './OrderSummarySection';
import OrderSummarySubtotals, { OrderSummarySubtotalsProps } from './OrderSummarySubtotals';
import OrderSummaryTotal from './OrderSummaryTotal';

export interface OrderSummaryDrawerProps {
    additionalLineItems?: ReactNode;
    lineItems: LineItemMap;
    total: number;
    storeCurrency: StoreCurrency;
    shopperCurrency: ShopperCurrencyType;
    isOpen: boolean;
    headerLink?: ReactNode & React.HTMLProps<HTMLDivElement>;
    onRequestClose?(): void;
    onAfterOpen?(): void;
}

const OrderSummaryModal: FunctionComponent<
    OrderSummaryDrawerProps & OrderSummarySubtotalsProps
> = ({
    additionalLineItems,
    children,
    isTaxIncluded,
    isUpdatedCartSummayModal = false,
    taxes,
    onRequestClose,
    onAfterOpen,
    storeCurrency,
    shopperCurrency,
    isOpen,
    headerLink,
    lineItems,
    total,
    ...orderSummarySubtotalsProps
}) => {

    const subHeaderText = <OrderModalSummarySubheader
        amountWithCurrency={<ShopperCurrency amount={total} />}
        items={lineItems}
        shopperCurrencyCode={shopperCurrency.code}
        storeCurrencyCode={storeCurrency.code}
    />;

    const continueButton = isUpdatedCartSummayModal && isSmallScreen() && <Button
        className='cart-modal-continue'
        data-test="manage-instrument-cancel-button"
        onClick={preventDefault(onRequestClose)}>
            <TranslatedString id="cart.return_to_checkout" />
    </Button>;

    return <Modal
        additionalBodyClassName="cart-modal-body optimizedCheckout-orderSummary"
        additionalHeaderClassName={`cart-modal-header optimizedCheckout-orderSummary${isUpdatedCartSummayModal ? ' with-continue-button' : ''}`}
        additionalModalClassName={isUpdatedCartSummayModal ? 'optimizedCheckout-cart-modal' : ''}
        footer={continueButton}
        header={renderHeader({
            headerLink,
            subHeaderText,
            isUpdatedCartSummayModal,
            onRequestClose,
        })}
        isOpen={isOpen}
        onAfterOpen={onAfterOpen}
        onRequestClose={onRequestClose}
    >
        <OrderSummarySection>
            {additionalLineItems}
        </OrderSummarySection>
        <OrderSummarySection>
            <OrderSummaryItems displayLineItemsCount={!isUpdatedCartSummayModal} items={lineItems} />
        </OrderSummarySection>
        <OrderSummarySection>
            <OrderSummarySubtotals isTaxIncluded={isTaxIncluded} taxes={taxes} {...orderSummarySubtotalsProps} />
        </OrderSummarySection>
        <OrderSummarySection>
            <OrderSummaryTotal
                orderAmount={total}
                shopperCurrencyCode={shopperCurrency.code}
                storeCurrencyCode={storeCurrency.code}
            />
        </OrderSummarySection>
    </Modal>
};

const renderHeader: FunctionComponent<{
    headerLink?: ReactNode & React.HTMLProps<HTMLDivElement>;
    subHeaderText: ReactNode;
    isUpdatedCartSummayModal: boolean;
    onRequestClose?(): void;
}> = ({ onRequestClose, headerLink, subHeaderText, isUpdatedCartSummayModal }) => {
    if (!isUpdatedCartSummayModal) {
       return <>
            <a className="cart-modal-close" href="#" onClick={preventDefault(onRequestClose)}>
                <span className="is-srOnly">
                    <TranslatedString id="common.close_action" />
                </span>
                <IconClose />
            </a>
            <ModalHeader additionalClassName="cart-modal-title">
                <TranslatedString id="cart.cart_heading" />
            </ModalHeader>

            {headerLink}
        </>;
    }

    let newHeaderLink;

    if (isValidElement(headerLink)) {
        newHeaderLink = cloneElement(headerLink, { className: 'modal-header-link cart-modal-link test' });
    }

    return <>
        {newHeaderLink ?? headerLink}
        <ModalHeader additionalClassName="cart-modal-title">
            <div>
                <TranslatedString id="cart.cart_heading" />
                <div className='cart-heading-subheader'>{subHeaderText}</div>
            </div>
        </ModalHeader>
        <a className="cart-modal-close" href="#" onClick={preventDefault(onRequestClose)}>
            <span className="is-srOnly">
                <TranslatedString id="common.close_action" />
            </span>
            <IconCloseWithBorder />
        </a>
    </>
};

export default OrderSummaryModal;
