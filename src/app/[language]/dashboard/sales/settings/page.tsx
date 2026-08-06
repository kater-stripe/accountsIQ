'use client';

import { Card } from '@/components/common/Card';
import { ConnectPaymentMethodSettings } from '@stripe/react-connect-js';
import { useTranslation } from 'react-i18next';

const PaymentSettingsPage = () => {
  const { t } = useTranslation();

  return (
    <div>
      <Card accent='#77B32A'>
        <h2 style={{ fontSize: 11, color: '#8892A0', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 14 }}>
          {t('dashboard.payments.payment-method-settings')}
        </h2>
        <div id='connect-payment-method-settings'>
          <ConnectPaymentMethodSettings />
        </div>
      </Card>
    </div>
  );
};

export default PaymentSettingsPage;
