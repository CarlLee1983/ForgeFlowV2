package ordertotal

import (
	"errors"
	"math"
	"testing"
)

func TestCalculateOrderTotal(t *testing.T) {
	t.Run("sums line item prices in cents", func(t *testing.T) {
		total, err := CalculateOrderTotal([]LineItem{
			{UnitPriceCents: 1_250, Quantity: 2},
			{UnitPriceCents: 499, Quantity: 1},
		})
		if err != nil {
			t.Fatalf("CalculateOrderTotal() error = %v", err)
		}
		if total != 2_999 {
			t.Fatalf("CalculateOrderTotal() = %d, want 2999", total)
		}
	})

	t.Run("returns zero for an empty order", func(t *testing.T) {
		total, err := CalculateOrderTotal(nil)
		if err != nil {
			t.Fatalf("CalculateOrderTotal() error = %v", err)
		}
		if total != 0 {
			t.Fatalf("CalculateOrderTotal() = %d, want 0", total)
		}
	})
}

func TestCalculateOrderTotalErrors(t *testing.T) {
	tests := []struct {
		name  string
		items []LineItem
		want  error
	}{
		{
			name:  "negative unit price",
			items: []LineItem{{UnitPriceCents: -1, Quantity: 1}},
			want:  ErrInvalidUnitPrice,
		},
		{
			name:  "non-positive quantity",
			items: []LineItem{{UnitPriceCents: 100, Quantity: 0}},
			want:  ErrInvalidQuantity,
		},
		{
			name:  "line total overflow",
			items: []LineItem{{UnitPriceCents: math.MaxInt64, Quantity: 2}},
			want:  ErrTotalOverflow,
		},
		{
			name: "order total overflow",
			items: []LineItem{
				{UnitPriceCents: math.MaxInt64, Quantity: 1},
				{UnitPriceCents: 1, Quantity: 1},
			},
			want: ErrTotalOverflow,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, err := CalculateOrderTotal(test.items)
			if !errors.Is(err, test.want) {
				t.Fatalf("CalculateOrderTotal() error = %v, want %v", err, test.want)
			}
		})
	}
}
