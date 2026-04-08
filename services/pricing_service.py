from datetime import datetime
from models import PricingRule, PromoCode, db
from sqlalchemy import and_

class PricingService:
    @staticmethod
    def calculate_price(base_price, check_in_date, check_out_date, promo_code_str=None):
        """
        Calculate final price including seasonal rules and promo codes.
        Returns detailed breakdown.
        """
        if isinstance(check_in_date, str):
            check_in_date = datetime.strptime(check_in_date, '%Y-%m-%d').date()
        if isinstance(check_out_date, str):
            check_out_date = datetime.strptime(check_out_date, '%Y-%m-%d').date()
            
        total_nights = (check_out_date - check_in_date).days
        if total_nights < 1:
            total_nights = 1
            
        # 1. Base Cost
        total_base = base_price * total_nights
        
        # 2. Apply Pricing Rules (Seasonality) - Simplified Logic
        # Finds active rule that overlaps with the start date
        active_rule = PricingRule.query.filter(
            and_(
                PricingRule.is_active == True,
                PricingRule.start_date <= check_in_date,
                PricingRule.end_date >= check_in_date
            )
        ).first()
        
        multiplier = 1.0
        rule_name = None
        if active_rule:
            multiplier = active_rule.price_multiplier
            rule_name = active_rule.name
            
        adjusted_subtotal = total_base * multiplier
        
        # 3. Apply Promo Code
        discount_amount = 0.0
        promo_applied = None
        
        if promo_code_str:
            promo = PromoCode.query.filter_by(code=promo_code_str, is_active=True).first()
            if promo:
                # Basic validation: check date and usage
                now = datetime.utcnow()
                if (not promo.valid_from or promo.valid_from <= now) and \
                   (not promo.valid_until or promo.valid_until >= now):
                       
                    discount = (adjusted_subtotal * (promo.discount_percent / 100))
                    if promo.max_discount_amount:
                        discount = min(discount, promo.max_discount_amount)
                    
                    discount_amount = discount
                    promo_applied = promo.code

        final_total = adjusted_subtotal - discount_amount
        
        # 4. Tax Calculation (e.g., 10% Service, 13% VAT) - Configurable ideally
        service_charge = final_total * 0.10
        vat_tax = (final_total + service_charge) * 0.13
        grand_total = final_total + service_charge + vat_tax
        
        return {
            'base_price_per_night': base_price,
            'total_nights': total_nights,
            'total_base': round(total_base, 2),
            'season_multiplier': multiplier,
            'season_name': rule_name,
            'subtotal_after_season': round(adjusted_subtotal, 2),
            'promo_code': promo_applied,
            'discount_amount': round(discount_amount, 2),
            'net_amount': round(final_total, 2),
            'service_charge': round(service_charge, 2),
            'tax': round(vat_tax, 2),
            'grand_total': round(grand_total, 2)
        }
