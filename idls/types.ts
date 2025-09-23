/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/daily_auction.json`.
 */
export type DailyAuction = {
  "address": "7o6VPgbp3FwH368f6vrbHVgKyuDBfdxFhTpqqAc5cwGR",
  "metadata": {
    "name": "dailyAuction",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "bid",
      "discriminator": [
        199,
        56,
        85,
        38,
        146,
        243,
        37,
        158
      ],
      "accounts": [
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "bidder",
          "writable": true,
          "signer": true
        },
        {
          "name": "oldBidder",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "newContent",
          "type": "string"
        }
      ]
    },
    {
      "name": "endAndStartAuction",
      "discriminator": [
        17,
        95,
        142,
        94,
        169,
        102,
        175,
        32
      ],
      "accounts": [
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "auction"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "newContent",
          "type": "string"
        }
      ]
    },
    {
      "name": "endAuction",
      "discriminator": [
        252,
        110,
        101,
        234,
        66,
        104,
        28,
        87
      ],
      "accounts": [
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "relations": [
            "auction"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "initialContent",
          "type": "string"
        }
      ]
    },
    {
      "name": "setAuthority",
      "discriminator": [
        133,
        250,
        37,
        21,
        110,
        163,
        26,
        121
      ],
      "accounts": [
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "auction"
          ]
        }
      ],
      "args": [
        {
          "name": "newAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "startAuction",
      "discriminator": [
        255,
        2,
        149,
        136,
        148,
        125,
        65,
        195
      ],
      "accounts": [
        {
          "name": "auction",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "auction"
          ]
        }
      ],
      "args": [
        {
          "name": "newContent",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "auction",
      "discriminator": [
        218,
        94,
        247,
        242,
        126,
        233,
        131,
        81
      ]
    }
  ],
  "events": [
    {
      "name": "auctionEnded",
      "discriminator": [
        91,
        165,
        139,
        202,
        204,
        215,
        92,
        52
      ]
    },
    {
      "name": "bidPlaced",
      "discriminator": [
        135,
        53,
        176,
        83,
        193,
        69,
        108,
        61
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "auctionAlreadyActive"
    },
    {
      "code": 6001,
      "name": "auctionNotActive"
    },
    {
      "code": 6002,
      "name": "auctionEnded"
    },
    {
      "code": 6003,
      "name": "bidTooLow"
    },
    {
      "code": 6004,
      "name": "auctionNotOver"
    },
    {
      "code": 6005,
      "name": "notTheWinner"
    },
    {
      "code": 6006,
      "name": "auctionIsActive"
    },
    {
      "code": 6007,
      "name": "missingBidderAccount"
    },
    {
      "code": 6008,
      "name": "invalidOldBidderAccount"
    },
    {
      "code": 6009,
      "name": "contentTooLong"
    }
  ],
  "types": [
    {
      "name": "auction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "newContent",
            "type": "string"
          },
          {
            "name": "oldContent",
            "type": "string"
          },
          {
            "name": "endTimestamp",
            "type": "i64"
          },
          {
            "name": "highestBid",
            "type": "u64"
          },
          {
            "name": "highestBidder",
            "type": "pubkey"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "auctionEnded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "winner",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "content",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "bidPlaced",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bidder",
            "type": "pubkey"
          },
          {
            "name": "oldBidder",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "newContent",
            "type": "string"
          }
        ]
      }
    }
  ]
};
