package ordertotal

import (
	"errors"
	"math"
)

var (
	ErrInvalidUnitPrice = errors.New("unit price must be non-negative")
	ErrInvalidQuantity  = errors.New("quantity must be positive")
	ErrTotalOverflow    = errors.New("order total exceeds the int64 range")
)

type LineItem struct {
	UnitPriceCents int64
	Quantity       int64
}

func CalculateOrderTotal(items []LineItem) (int64, error) {
	var total int64

	for _, item := range items {
		if item.UnitPriceCents < 0 {
			return 0, ErrInvalidUnitPrice
		}
		if item.Quantity <= 0 {
			return 0, ErrInvalidQuantity
		}
		if item.UnitPriceCents > math.MaxInt64/item.Quantity {
			return 0, ErrTotalOverflow
		}

		lineTotal := item.UnitPriceCents * item.Quantity
		if total > math.MaxInt64-lineTotal {
			return 0, ErrTotalOverflow
		}
		total += lineTotal
	}

	return total, nil
}
