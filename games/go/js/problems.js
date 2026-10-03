/**
 * 围棋练习题。入门三级为馆内原创；四级起为公有领域古典死活与官子。
 * 由 games/go/tools/build-problems.mjs 生成。不要手改古典题坐标。
 *
 * 来源：
 * - 碁经众妙 Gokyo Shumyo（Hayashi Genbi，1812）
 * - 玄玄棋经 Xuanxuan Qijing（严德甫、晏天章，约 1349；SGF：Jean-Pierre Vesinet）
 * - 官子谱（公有领域；Flygo 转录，Ulrich Goertz 汇总于 u-go.net）
 * 未收录近代受版权保护的死活题集。
 */
export const TRACKS = [
  {
    "id": "tactic",
    "name": "死活战术",
    "intro": "从提子、逃气练到古典死活。做完本级全部题，才解锁下一级。",
    "levels": [
      {
        "level": 1,
        "name": "一级 · 提子与逃气"
      },
      {
        "level": 2,
        "name": "二级 · 连接与双打"
      },
      {
        "level": 3,
        "name": "三级 · 征子与扑吃"
      },
      {
        "level": 4,
        "name": "四级 · 碁经众妙入门"
      },
      {
        "level": 5,
        "name": "五级 · 碁经众妙进阶"
      },
      {
        "level": 6,
        "name": "六级 · 玄玄棋经"
      }
    ]
  },
  {
    "id": "yose",
    "name": "官子残局",
    "intro": "用《官子谱》的古典官子，按手数从短到长。做完本级才解锁下一级。",
    "levels": [
      {
        "level": 1,
        "name": "一级 · 一手官子"
      },
      {
        "level": 2,
        "name": "二级 · 短收官"
      },
      {
        "level": 3,
        "name": "三级 · 三手前后"
      },
      {
        "level": 4,
        "name": "四级 · 局部收官"
      },
      {
        "level": 5,
        "name": "五级 · 官子谱进阶"
      },
      {
        "level": 6,
        "name": "六级 · 官子谱高段"
      }
    ]
  }
];

export const PROBLEMS = [
  {
    "id": "tactic-1-01",
    "track": "tactic",
    "level": 1,
    "title": "提掉一子",
    "prompt": "黑先。白子只剩一口气，把它提掉。",
    "source": "馆内原创",
    "size": 9,
    "toPlay": 1,
    "black": [
      [
        3,
        4
      ],
      [
        4,
        3
      ],
      [
        5,
        4
      ]
    ],
    "white": [
      [
        4,
        4
      ]
    ],
    "moves": [
      {
        "x": 4,
        "y": 5,
        "color": 1,
        "replies": []
      }
    ]
  },
  {
    "id": "tactic-1-02",
    "track": "tactic",
    "level": 1,
    "title": "角上的两子",
    "prompt": "黑先。角上两子连在一起，一口气提掉。",
    "source": "馆内原创",
    "size": 9,
    "toPlay": 1,
    "black": [
      [
        1,
        0
      ],
      [
        0,
        2
      ]
    ],
    "white": [
      [
        0,
        0
      ],
      [
        0,
        1
      ]
    ],
    "moves": [
      {
        "x": 1,
        "y": 1,
        "color": 1,
        "replies": []
      }
    ]
  },
  {
    "id": "tactic-1-03",
    "track": "tactic",
    "level": 1,
    "title": "逃出这一子",
    "prompt": "黑先。自己的子被叫吃了，把气长出来。",
    "source": "馆内原创",
    "size": 9,
    "toPlay": 1,
    "black": [
      [
        4,
        4
      ]
    ],
    "white": [
      [
        3,
        4
      ],
      [
        5,
        4
      ],
      [
        4,
        3
      ]
    ],
    "moves": [
      {
        "x": 4,
        "y": 5,
        "color": 1,
        "replies": []
      }
    ]
  },
  {
    "id": "tactic-1-04",
    "track": "tactic",
    "level": 1,
    "title": "提掉相连的两子",
    "prompt": "黑先。两颗白子连成一串，只剩一口气。",
    "source": "馆内原创",
    "size": 9,
    "toPlay": 1,
    "black": [
      [
        3,
        3
      ],
      [
        5,
        3
      ],
      [
        3,
        4
      ],
      [
        5,
        4
      ],
      [
        4,
        2
      ]
    ],
    "white": [
      [
        4,
        3
      ],
      [
        4,
        4
      ]
    ],
    "moves": [
      {
        "x": 4,
        "y": 5,
        "color": 1,
        "replies": []
      }
    ]
  },
  {
    "id": "tactic-1-05",
    "track": "tactic",
    "level": 1,
    "title": "边上提子",
    "prompt": "黑先。边上的白子没有外气了。",
    "source": "馆内原创",
    "size": 9,
    "toPlay": 1,
    "black": [
      [
        1,
        4
      ],
      [
        0,
        3
      ]
    ],
    "white": [
      [
        0,
        4
      ]
    ],
    "moves": [
      {
        "x": 0,
        "y": 5,
        "color": 1,
        "replies": []
      }
    ]
  },
  {
    "id": "tactic-1-06",
    "track": "tactic",
    "level": 1,
    "title": "轮到白棋提子",
    "prompt": "白先。这次你执白，把被叫吃的黑子提掉。",
    "source": "馆内原创",
    "size": 9,
    "toPlay": 2,
    "black": [
      [
        4,
        4
      ]
    ],
    "white": [
      [
        3,
        4
      ],
      [
        4,
        3
      ],
      [
        5,
        4
      ]
    ],
    "moves": [
      {
        "x": 4,
        "y": 5,
        "color": 2,
        "replies": []
      }
    ]
  },
  {
    "id": "tactic-2-01",
    "track": "tactic",
    "level": 2,
    "title": "连接救回",
    "prompt": "黑先。左边一子只剩一口气，连到右边就能活。",
    "source": "馆内原创",
    "size": 9,
    "toPlay": 1,
    "black": [
      [
        3,
        4
      ],
      [
        5,
        4
      ]
    ],
    "white": [
      [
        3,
        3
      ],
      [
        3,
        5
      ],
      [
        2,
        4
      ]
    ],
    "moves": [
      {
        "x": 4,
        "y": 4,
        "color": 1,
        "replies": []
      }
    ]
  },
  {
    "id": "tactic-2-02",
    "track": "tactic",
    "level": 2,
    "title": "打吃再提",
    "prompt": "黑先。先叫吃，白棋长出一步后，再把它提掉。",
    "source": "馆内原创",
    "size": 9,
    "toPlay": 1,
    "black": [
      [
        3,
        4
      ],
      [
        4,
        3
      ],
      [
        3,
        5
      ],
      [
        5,
        5
      ]
    ],
    "white": [
      [
        4,
        4
      ]
    ],
    "moves": [
      {
        "x": 5,
        "y": 4,
        "color": 1,
        "replies": [
          {
            "x": 4,
            "y": 5,
            "color": 2,
            "replies": [
              {
                "x": 4,
                "y": 6,
                "color": 1,
                "replies": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "tactic-2-03",
    "track": "tactic",
    "level": 2,
    "title": "提子解围",
    "prompt": "黑先。自己被叫吃时，把正在叫吃的那颗白子提掉。",
    "source": "馆内原创",
    "size": 9,
    "toPlay": 1,
    "black": [
      [
        4,
        4
      ],
      [
        4,
        2
      ],
      [
        5,
        3
      ]
    ],
    "white": [
      [
        4,
        3
      ],
      [
        3,
        4
      ],
      [
        5,
        4
      ]
    ],
    "moves": [
      {
        "x": 3,
        "y": 3,
        "color": 1,
        "replies": []
      }
    ]
  },
  {
    "id": "tactic-2-04",
    "track": "tactic",
    "level": 2,
    "title": "双打吃",
    "prompt": "黑先。一着同时叫吃两块白棋。白棋救一块，你提掉另一块。",
    "source": "馆内原创",
    "size": 9,
    "toPlay": 1,
    "black": [
      [
        4,
        2
      ],
      [
        3,
        1
      ],
      [
        4,
        4
      ],
      [
        3,
        5
      ]
    ],
    "white": [
      [
        3,
        2
      ],
      [
        3,
        4
      ]
    ],
    "moves": [
      {
        "x": 3,
        "y": 3,
        "color": 1,
        "replies": [
          {
            "x": 2,
            "y": 2,
            "color": 2,
            "replies": [
              {
                "x": 2,
                "y": 4,
                "color": 1,
                "replies": []
              }
            ]
          },
          {
            "x": 2,
            "y": 4,
            "color": 2,
            "replies": [
              {
                "x": 2,
                "y": 2,
                "color": 1,
                "replies": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "tactic-2-05",
    "track": "tactic",
    "level": 2,
    "title": "白先收角",
    "prompt": "白先。角上两颗黑子，一口气提掉。",
    "source": "馆内原创",
    "size": 9,
    "toPlay": 2,
    "black": [
      [
        0,
        0
      ],
      [
        0,
        1
      ]
    ],
    "white": [
      [
        1,
        0
      ],
      [
        0,
        2
      ]
    ],
    "moves": [
      {
        "x": 1,
        "y": 1,
        "color": 2,
        "replies": []
      }
    ]
  },
  {
    "id": "tactic-2-06",
    "track": "tactic",
    "level": 2,
    "title": "提掉眼中一子",
    "prompt": "黑先。白子堵在眼位里，把最后一口气补上。",
    "source": "馆内原创",
    "size": 9,
    "toPlay": 1,
    "black": [
      [
        1,
        1
      ],
      [
        1,
        2
      ],
      [
        1,
        3
      ],
      [
        2,
        3
      ],
      [
        3,
        3
      ],
      [
        3,
        2
      ],
      [
        3,
        1
      ],
      [
        2,
        0
      ]
    ],
    "white": [
      [
        2,
        2
      ]
    ],
    "moves": [
      {
        "x": 2,
        "y": 1,
        "color": 1,
        "replies": []
      }
    ]
  },
  {
    "id": "tactic-3-01",
    "track": "tactic",
    "level": 3,
    "title": "征子到边",
    "prompt": "黑先。这是征子：每次都叫吃，一直追到边上提掉。另一侧不是征子。",
    "source": "馆内原创",
    "size": 9,
    "toPlay": 1,
    "black": [
      [
        2,
        1
      ],
      [
        3,
        2
      ]
    ],
    "white": [
      [
        3,
        1
      ]
    ],
    "moves": [
      {
        "x": 4,
        "y": 1,
        "color": 1,
        "replies": [
          {
            "x": 3,
            "y": 0,
            "color": 2,
            "replies": [
              {
                "x": 4,
                "y": 0,
                "color": 1,
                "replies": [
                  {
                    "x": 2,
                    "y": 0,
                    "color": 2,
                    "replies": [
                      {
                        "x": 1,
                        "y": 0,
                        "color": 1,
                        "replies": []
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "tactic-3-02",
    "track": "tactic",
    "level": 3,
    "title": "扑吃",
    "prompt": "黑先。扑进对方的气里，直接提掉一子。",
    "source": "馆内原创",
    "size": 9,
    "toPlay": 1,
    "black": [
      [
        1,
        0
      ],
      [
        3,
        0
      ],
      [
        0,
        1
      ],
      [
        3,
        1
      ],
      [
        0,
        2
      ],
      [
        3,
        2
      ],
      [
        1,
        3
      ],
      [
        2,
        3
      ]
    ],
    "white": [
      [
        2,
        0
      ],
      [
        1,
        2
      ],
      [
        2,
        2
      ]
    ],
    "moves": [
      {
        "x": 2,
        "y": 1,
        "color": 1,
        "replies": []
      }
    ]
  },
  {
    "id": "tactic-3-03",
    "track": "tactic",
    "level": 3,
    "title": "白先打吃再提",
    "prompt": "白先。先叫吃，黑棋长出后，再提掉。",
    "source": "馆内原创",
    "size": 9,
    "toPlay": 2,
    "black": [
      [
        4,
        4
      ]
    ],
    "white": [
      [
        3,
        4
      ],
      [
        4,
        3
      ],
      [
        3,
        5
      ],
      [
        5,
        5
      ]
    ],
    "moves": [
      {
        "x": 5,
        "y": 4,
        "color": 2,
        "replies": [
          {
            "x": 4,
            "y": 5,
            "color": 1,
            "replies": [
              {
                "x": 4,
                "y": 6,
                "color": 2,
                "replies": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "tactic-3-04",
    "track": "tactic",
    "level": 3,
    "title": "一子双提",
    "prompt": "黑先。一个点同时是两块白棋的最后一口气。",
    "source": "馆内原创",
    "size": 9,
    "toPlay": 1,
    "black": [
      [
        4,
        2
      ],
      [
        3,
        1
      ],
      [
        2,
        2
      ],
      [
        4,
        4
      ],
      [
        3,
        5
      ],
      [
        2,
        4
      ]
    ],
    "white": [
      [
        3,
        2
      ],
      [
        3,
        4
      ]
    ],
    "moves": [
      {
        "x": 3,
        "y": 3,
        "color": 1,
        "replies": []
      }
    ]
  },
  {
    "id": "tactic-3-05",
    "track": "tactic",
    "level": 3,
    "title": "边路打吃再提",
    "prompt": "黑先。和二级的打吃一样，这次换到靠左边的位置。",
    "source": "馆内原创",
    "size": 9,
    "toPlay": 1,
    "black": [
      [
        1,
        3
      ],
      [
        2,
        2
      ],
      [
        1,
        4
      ],
      [
        3,
        4
      ]
    ],
    "white": [
      [
        2,
        3
      ]
    ],
    "moves": [
      {
        "x": 3,
        "y": 3,
        "color": 1,
        "replies": [
          {
            "x": 2,
            "y": 4,
            "color": 2,
            "replies": [
              {
                "x": 2,
                "y": 5,
                "color": 1,
                "replies": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "tactic-3-06",
    "track": "tactic",
    "level": 3,
    "title": "角上三子",
    "prompt": "黑先。角上三子只剩一口气，找对那个点。",
    "source": "馆内原创",
    "size": 9,
    "toPlay": 1,
    "black": [
      [
        2,
        0
      ],
      [
        0,
        2
      ]
    ],
    "white": [
      [
        0,
        0
      ],
      [
        1,
        0
      ],
      [
        0,
        1
      ]
    ],
    "moves": [
      {
        "x": 1,
        "y": 1,
        "color": 1,
        "replies": []
      }
    ]
  },
  {
    "id": "tactic-4-01",
    "track": "tactic",
    "level": 4,
    "title": "碁经众妙 · 入门 1",
    "prompt": "黑先。古典死活，适合从入门往上走。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "碁经众妙（1812，公有领域；正解谱来自 u-go.net / Flygo）",
    "size": 19,
    "toPlay": 1,
    "black": [
      [
        14,
        1
      ],
      [
        15,
        1
      ],
      [
        17,
        1
      ],
      [
        10,
        2
      ],
      [
        16,
        2
      ],
      [
        18,
        2
      ],
      [
        16,
        3
      ]
    ],
    "white": [
      [
        12,
        2
      ],
      [
        13,
        2
      ],
      [
        15,
        2
      ],
      [
        17,
        2
      ],
      [
        15,
        3
      ],
      [
        17,
        3
      ],
      [
        13,
        4
      ],
      [
        16,
        4
      ],
      [
        17,
        4
      ]
    ],
    "moves": [
      {
        "x": 16,
        "y": 0,
        "color": 1,
        "replies": []
      }
    ]
  },
  {
    "id": "tactic-4-02",
    "track": "tactic",
    "level": 4,
    "title": "碁经众妙 · 入门 2",
    "prompt": "白先。古典死活，适合从入门往上走。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "碁经众妙（1812，公有领域；正解谱来自 u-go.net / Flygo）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        2,
        12
      ],
      [
        2,
        14
      ],
      [
        4,
        14
      ],
      [
        3,
        15
      ],
      [
        4,
        16
      ],
      [
        3,
        17
      ],
      [
        4,
        17
      ]
    ],
    "white": [
      [
        1,
        16
      ],
      [
        2,
        16
      ],
      [
        3,
        16
      ],
      [
        2,
        17
      ]
    ],
    "moves": [
      {
        "x": 1,
        "y": 14,
        "color": 2,
        "replies": [
          {
            "x": 1,
            "y": 13,
            "color": 1,
            "replies": [
              {
                "x": 0,
                "y": 14,
                "color": 2,
                "replies": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "tactic-4-03",
    "track": "tactic",
    "level": 4,
    "title": "碁经众妙 · 入门 3",
    "prompt": "黑先。古典死活，适合从入门往上走。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "碁经众妙（1812，公有领域；正解谱来自 u-go.net / Flygo）",
    "size": 19,
    "toPlay": 1,
    "black": [
      [
        14,
        1
      ],
      [
        13,
        2
      ],
      [
        15,
        2
      ],
      [
        15,
        3
      ],
      [
        16,
        3
      ],
      [
        16,
        5
      ],
      [
        16,
        7
      ]
    ],
    "white": [
      [
        15,
        0
      ],
      [
        15,
        1
      ],
      [
        16,
        2
      ],
      [
        17,
        2
      ],
      [
        17,
        3
      ]
    ],
    "moves": [
      {
        "x": 17,
        "y": 0,
        "color": 1,
        "replies": [
          {
            "x": 16,
            "y": 1,
            "color": 2,
            "replies": [
              {
                "x": 17,
                "y": 4,
                "color": 1,
                "replies": []
              }
            ]
          },
          {
            "x": 17,
            "y": 4,
            "color": 2,
            "replies": [
              {
                "x": 17,
                "y": 5,
                "color": 1,
                "replies": [
                  {
                    "x": 18,
                    "y": 4,
                    "color": 2,
                    "replies": [
                      {
                        "x": 16,
                        "y": 1,
                        "color": 1,
                        "replies": [
                          {
                            "x": 17,
                            "y": 1,
                            "color": 2,
                            "replies": [
                              {
                                "x": 14,
                                "y": 0,
                                "color": 1,
                                "replies": []
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  {
                    "x": 16,
                    "y": 1,
                    "color": 2,
                    "replies": [
                      {
                        "x": 18,
                        "y": 4,
                        "color": 1,
                        "replies": [
                          {
                            "x": 18,
                            "y": 3,
                            "color": 2,
                            "replies": [
                              {
                                "x": 18,
                                "y": 1,
                                "color": 1,
                                "replies": []
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "tactic-4-04",
    "track": "tactic",
    "level": 4,
    "title": "碁经众妙 · 入门 4",
    "prompt": "黑先。古典死活，适合从入门往上走。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "碁经众妙（1812，公有领域；正解谱来自 u-go.net / Flygo）",
    "size": 19,
    "toPlay": 1,
    "black": [
      [
        0,
        14
      ],
      [
        1,
        15
      ],
      [
        1,
        16
      ],
      [
        2,
        16
      ],
      [
        3,
        16
      ],
      [
        3,
        17
      ]
    ],
    "white": [
      [
        1,
        13
      ],
      [
        1,
        14
      ],
      [
        3,
        14
      ],
      [
        0,
        15
      ],
      [
        2,
        15
      ],
      [
        4,
        15
      ],
      [
        4,
        16
      ],
      [
        4,
        17
      ]
    ],
    "moves": [
      {
        "x": 1,
        "y": 18,
        "color": 1,
        "replies": [
          {
            "x": 0,
            "y": 17,
            "color": 2,
            "replies": [
              {
                "x": 1,
                "y": 17,
                "color": 1,
                "replies": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "tactic-4-05",
    "track": "tactic",
    "level": 4,
    "title": "碁经众妙 · 入门 5",
    "prompt": "白先。古典死活，适合从入门往上走。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "碁经众妙（1812，公有领域；正解谱来自 u-go.net / Flygo）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        13,
        1
      ],
      [
        14,
        1
      ],
      [
        12,
        2
      ],
      [
        12,
        3
      ],
      [
        16,
        3
      ],
      [
        17,
        3
      ],
      [
        14,
        4
      ],
      [
        16,
        5
      ]
    ],
    "white": [
      [
        15,
        1
      ],
      [
        18,
        1
      ],
      [
        13,
        2
      ],
      [
        14,
        2
      ],
      [
        16,
        2
      ]
    ],
    "moves": [
      {
        "x": 14,
        "y": 0,
        "color": 2,
        "replies": [
          {
            "x": 12,
            "y": 1,
            "color": 1,
            "replies": [
              {
                "x": 17,
                "y": 0,
                "color": 2,
                "replies": [
                  {
                    "x": 17,
                    "y": 2,
                    "color": 1,
                    "replies": [
                      {
                        "x": 17,
                        "y": 1,
                        "color": 2,
                        "replies": []
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "tactic-4-06",
    "track": "tactic",
    "level": 4,
    "title": "碁经众妙 · 入门 6",
    "prompt": "黑先。古典死活，适合从入门往上走。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "碁经众妙（1812，公有领域；正解谱来自 u-go.net / Flygo）",
    "size": 19,
    "toPlay": 1,
    "black": [
      [
        13,
        0
      ],
      [
        14,
        1
      ],
      [
        15,
        1
      ],
      [
        16,
        2
      ],
      [
        17,
        2
      ],
      [
        17,
        3
      ]
    ],
    "white": [
      [
        12,
        1
      ],
      [
        13,
        1
      ],
      [
        14,
        2
      ],
      [
        15,
        2
      ],
      [
        16,
        3
      ],
      [
        18,
        3
      ],
      [
        16,
        4
      ],
      [
        17,
        4
      ]
    ],
    "moves": [
      {
        "x": 17,
        "y": 0,
        "color": 1,
        "replies": [
          {
            "x": 18,
            "y": 1,
            "color": 2,
            "replies": [
              {
                "x": 18,
                "y": 2,
                "color": 1,
                "replies": [
                  {
                    "x": 14,
                    "y": 0,
                    "color": 2,
                    "replies": [
                      {
                        "x": 15,
                        "y": 0,
                        "color": 1,
                        "replies": []
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "x": 17,
        "y": 1,
        "color": 1,
        "replies": [
          {
            "x": 16,
            "y": 0,
            "color": 2,
            "replies": [
              {
                "x": 17,
                "y": 0,
                "color": 1,
                "replies": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "tactic-5-01",
    "track": "tactic",
    "level": 5,
    "title": "碁经众妙 · 进阶 1",
    "prompt": "白先。这一级手数更长。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "碁经众妙（1812，公有领域；正解谱来自 u-go.net / Flygo）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        16,
        1
      ],
      [
        10,
        2
      ],
      [
        11,
        2
      ],
      [
        16,
        2
      ],
      [
        12,
        3
      ],
      [
        15,
        3
      ],
      [
        16,
        3
      ],
      [
        13,
        4
      ],
      [
        14,
        4
      ]
    ],
    "white": [
      [
        12,
        1
      ],
      [
        15,
        1
      ],
      [
        13,
        2
      ],
      [
        15,
        2
      ],
      [
        13,
        3
      ]
    ],
    "moves": [
      {
        "x": 14,
        "y": 1,
        "color": 2,
        "replies": [
          {
            "x": 15,
            "y": 0,
            "color": 1,
            "replies": [
              {
                "x": 13,
                "y": 0,
                "color": 2,
                "replies": [
                  {
                    "x": 14,
                    "y": 3,
                    "color": 1,
                    "replies": [
                      {
                        "x": 11,
                        "y": 1,
                        "color": 2,
                        "replies": []
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "tactic-5-02",
    "track": "tactic",
    "level": 5,
    "title": "碁经众妙 · 进阶 2",
    "prompt": "黑先。这一级手数更长。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "碁经众妙（1812，公有领域；正解谱来自 u-go.net / Flygo）",
    "size": 19,
    "toPlay": 1,
    "black": [
      [
        17,
        1
      ],
      [
        15,
        2
      ],
      [
        17,
        2
      ],
      [
        15,
        3
      ],
      [
        16,
        3
      ],
      [
        15,
        4
      ],
      [
        14,
        5
      ],
      [
        16,
        5
      ],
      [
        16,
        6
      ],
      [
        17,
        6
      ]
    ],
    "white": [
      [
        17,
        0
      ],
      [
        15,
        1
      ],
      [
        16,
        1
      ],
      [
        13,
        2
      ],
      [
        14,
        2
      ],
      [
        16,
        2
      ],
      [
        17,
        3
      ],
      [
        16,
        4
      ],
      [
        17,
        4
      ],
      [
        17,
        5
      ]
    ],
    "moves": [
      {
        "x": 18,
        "y": 1,
        "color": 1,
        "replies": [
          {
            "x": 18,
            "y": 4,
            "color": 2,
            "replies": [
              {
                "x": 18,
                "y": 6,
                "color": 1,
                "replies": [
                  {
                    "x": 18,
                    "y": 2,
                    "color": 2,
                    "replies": [
                      {
                        "x": 18,
                        "y": 3,
                        "color": 1,
                        "replies": []
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            "x": 16,
            "y": 0,
            "color": 2,
            "replies": [
              {
                "x": 14,
                "y": 1,
                "color": 1,
                "replies": [
                  {
                    "x": 13,
                    "y": 1,
                    "color": 2,
                    "replies": [
                      {
                        "x": 18,
                        "y": 5,
                        "color": 1,
                        "replies": []
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "tactic-5-03",
    "track": "tactic",
    "level": 5,
    "title": "碁经众妙 · 进阶 3",
    "prompt": "黑先。这一级手数更长。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "碁经众妙（1812，公有领域；正解谱来自 u-go.net / Flygo）",
    "size": 19,
    "toPlay": 1,
    "black": [
      [
        2,
        14
      ],
      [
        1,
        15
      ],
      [
        3,
        15
      ],
      [
        4,
        15
      ],
      [
        4,
        16
      ],
      [
        6,
        16
      ],
      [
        5,
        17
      ]
    ],
    "white": [
      [
        2,
        16
      ],
      [
        3,
        16
      ],
      [
        1,
        17
      ],
      [
        4,
        17
      ],
      [
        3,
        18
      ]
    ],
    "moves": [
      {
        "x": 0,
        "y": 17,
        "color": 1,
        "replies": [
          {
            "x": 0,
            "y": 16,
            "color": 2,
            "replies": [
              {
                "x": 1,
                "y": 16,
                "color": 1,
                "replies": [
                  {
                    "x": 0,
                    "y": 18,
                    "color": 2,
                    "replies": [
                      {
                        "x": 2,
                        "y": 18,
                        "color": 1,
                        "replies": [
                          {
                            "x": 2,
                            "y": 17,
                            "color": 2,
                            "replies": [
                              {
                                "x": 5,
                                "y": 18,
                                "color": 1,
                                "replies": []
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  {
                    "x": 2,
                    "y": 17,
                    "color": 2,
                    "replies": [
                      {
                        "x": 1,
                        "y": 18,
                        "color": 1,
                        "replies": []
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "tactic-5-04",
    "track": "tactic",
    "level": 5,
    "title": "碁经众妙 · 进阶 4",
    "prompt": "黑先。这一级手数更长。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "碁经众妙（1812，公有领域；正解谱来自 u-go.net / Flygo）",
    "size": 19,
    "toPlay": 1,
    "black": [
      [
        3,
        15
      ],
      [
        8,
        15
      ],
      [
        9,
        15
      ],
      [
        3,
        16
      ],
      [
        5,
        16
      ],
      [
        6,
        16
      ],
      [
        10,
        16
      ],
      [
        11,
        16
      ],
      [
        3,
        17
      ],
      [
        2,
        18
      ]
    ],
    "white": [
      [
        4,
        13
      ],
      [
        2,
        14
      ],
      [
        7,
        14
      ],
      [
        8,
        14
      ],
      [
        9,
        14
      ],
      [
        1,
        15
      ],
      [
        5,
        15
      ],
      [
        6,
        15
      ],
      [
        10,
        15
      ],
      [
        7,
        16
      ],
      [
        1,
        17
      ],
      [
        2,
        17
      ]
    ],
    "moves": [
      {
        "x": 8,
        "y": 17,
        "color": 1,
        "replies": [
          {
            "x": 7,
            "y": 17,
            "color": 2,
            "replies": [
              {
                "x": 7,
                "y": 18,
                "color": 1,
                "replies": [
                  {
                    "x": 6,
                    "y": 17,
                    "color": 2,
                    "replies": [
                      {
                        "x": 5,
                        "y": 17,
                        "color": 1,
                        "replies": [
                          {
                            "x": 6,
                            "y": 18,
                            "color": 2,
                            "replies": [
                              {
                                "x": 7,
                                "y": 15,
                                "color": 1,
                                "replies": []
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "tactic-5-05",
    "track": "tactic",
    "level": 5,
    "title": "碁经众妙 · 进阶 5",
    "prompt": "黑先。这一级手数更长。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "碁经众妙（1812，公有领域；正解谱来自 u-go.net / Flygo）",
    "size": 19,
    "toPlay": 1,
    "black": [
      [
        1,
        15
      ],
      [
        1,
        16
      ],
      [
        3,
        16
      ],
      [
        3,
        17
      ],
      [
        4,
        18
      ]
    ],
    "white": [
      [
        1,
        14
      ],
      [
        3,
        14
      ],
      [
        2,
        15
      ],
      [
        4,
        15
      ],
      [
        4,
        16
      ],
      [
        4,
        17
      ],
      [
        6,
        17
      ]
    ],
    "moves": [
      {
        "x": 0,
        "y": 17,
        "color": 1,
        "replies": [
          {
            "x": 1,
            "y": 18,
            "color": 2,
            "replies": [
              {
                "x": 0,
                "y": 15,
                "color": 1,
                "replies": [
                  {
                    "x": 2,
                    "y": 17,
                    "color": 2,
                    "replies": [
                      {
                        "x": 2,
                        "y": 16,
                        "color": 1,
                        "replies": [
                          {
                            "x": 3,
                            "y": 18,
                            "color": 2,
                            "replies": [
                              {
                                "x": 1,
                                "y": 17,
                                "color": 1,
                                "replies": [
                                  {
                                    "x": 5,
                                    "y": 18,
                                    "color": 2,
                                    "replies": [
                                      {
                                        "x": 0,
                                        "y": 18,
                                        "color": 1,
                                        "replies": []
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "tactic-5-06",
    "track": "tactic",
    "level": 5,
    "title": "碁经众妙 · 进阶 6",
    "prompt": "白先。这一级手数更长。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "碁经众妙（1812，公有领域；正解谱来自 u-go.net / Flygo）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        11,
        1
      ],
      [
        15,
        1
      ],
      [
        16,
        1
      ],
      [
        11,
        2
      ],
      [
        13,
        2
      ],
      [
        14,
        2
      ],
      [
        13,
        3
      ]
    ],
    "white": [
      [
        12,
        1
      ],
      [
        13,
        1
      ],
      [
        14,
        1
      ],
      [
        15,
        2
      ],
      [
        14,
        3
      ],
      [
        15,
        3
      ],
      [
        16,
        4
      ]
    ],
    "moves": [
      {
        "x": 17,
        "y": 1,
        "color": 2,
        "replies": [
          {
            "x": 17,
            "y": 2,
            "color": 1,
            "replies": [
              {
                "x": 16,
                "y": 2,
                "color": 2,
                "replies": [
                  {
                    "x": 17,
                    "y": 0,
                    "color": 1,
                    "replies": [
                      {
                        "x": 18,
                        "y": 1,
                        "color": 2,
                        "replies": [
                          {
                            "x": 18,
                            "y": 2,
                            "color": 1,
                            "replies": [
                              {
                                "x": 15,
                                "y": 0,
                                "color": 2,
                                "replies": [
                                  {
                                    "x": 18,
                                    "y": 0,
                                    "color": 1,
                                    "replies": [
                                      {
                                        "x": 17,
                                        "y": 1,
                                        "color": 2,
                                        "replies": [
                                          {
                                            "x": 18,
                                            "y": 1,
                                            "color": 1,
                                            "replies": [
                                              {
                                                "x": 14,
                                                "y": 0,
                                                "color": 2,
                                                "replies": []
                                              }
                                            ]
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "tactic-6-01",
    "track": "tactic",
    "level": 6,
    "title": "玄玄棋经 · 1",
    "prompt": "黑先。玄玄棋经是高段死活。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "玄玄棋经（约 1349，公有领域；SGF：Jean-Pierre Vesinet）",
    "size": 19,
    "toPlay": 1,
    "black": [
      [
        0,
        15
      ],
      [
        1,
        15
      ],
      [
        2,
        15
      ],
      [
        2,
        13
      ],
      [
        3,
        14
      ],
      [
        4,
        14
      ],
      [
        5,
        15
      ],
      [
        6,
        14
      ],
      [
        6,
        16
      ],
      [
        6,
        17
      ],
      [
        8,
        17
      ]
    ],
    "white": [
      [
        0,
        16
      ],
      [
        1,
        16
      ],
      [
        2,
        16
      ],
      [
        2,
        17
      ],
      [
        2,
        18
      ],
      [
        3,
        15
      ],
      [
        5,
        16
      ],
      [
        5,
        17
      ]
    ],
    "moves": [
      {
        "x": 5,
        "y": 18,
        "color": 1,
        "replies": [
          {
            "x": 4,
            "y": 18,
            "color": 2,
            "replies": [
              {
                "x": 3,
                "y": 17,
                "color": 1,
                "replies": [
                  {
                    "x": 3,
                    "y": 16,
                    "color": 2,
                    "replies": [
                      {
                        "x": 4,
                        "y": 16,
                        "color": 1,
                        "replies": []
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "tactic-6-02",
    "track": "tactic",
    "level": 6,
    "title": "玄玄棋经 · 2",
    "prompt": "黑先。玄玄棋经是高段死活。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "玄玄棋经（约 1349，公有领域；SGF：Jean-Pierre Vesinet）",
    "size": 19,
    "toPlay": 1,
    "black": [
      [
        1,
        14
      ],
      [
        2,
        13
      ],
      [
        2,
        15
      ],
      [
        3,
        15
      ],
      [
        4,
        16
      ],
      [
        5,
        16
      ],
      [
        5,
        17
      ],
      [
        5,
        18
      ]
    ],
    "white": [
      [
        1,
        16
      ],
      [
        1,
        15
      ],
      [
        2,
        16
      ],
      [
        3,
        16
      ],
      [
        4,
        17
      ],
      [
        3,
        18
      ]
    ],
    "moves": [
      {
        "x": 3,
        "y": 17,
        "color": 1,
        "replies": [
          {
            "x": 2,
            "y": 17,
            "color": 2,
            "replies": [
              {
                "x": 1,
                "y": 18,
                "color": 1,
                "replies": [
                  {
                    "x": 1,
                    "y": 17,
                    "color": 2,
                    "replies": [
                      {
                        "x": 4,
                        "y": 18,
                        "color": 1,
                        "replies": [
                          {
                            "x": 0,
                            "y": 15,
                            "color": 2,
                            "replies": [
                              {
                                "x": 0,
                                "y": 17,
                                "color": 1,
                                "replies": []
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "tactic-6-03",
    "track": "tactic",
    "level": 6,
    "title": "玄玄棋经 · 3",
    "prompt": "黑先。玄玄棋经是高段死活。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "玄玄棋经（约 1349，公有领域；SGF：Jean-Pierre Vesinet）",
    "size": 19,
    "toPlay": 1,
    "black": [
      [
        15,
        3
      ],
      [
        12,
        3
      ],
      [
        12,
        2
      ],
      [
        12,
        1
      ],
      [
        11,
        3
      ],
      [
        10,
        3
      ],
      [
        9,
        3
      ],
      [
        9,
        2
      ],
      [
        9,
        1
      ]
    ],
    "white": [
      [
        6,
        1
      ],
      [
        8,
        1
      ],
      [
        8,
        2
      ],
      [
        8,
        3
      ],
      [
        8,
        4
      ],
      [
        9,
        4
      ],
      [
        10,
        4
      ],
      [
        11,
        4
      ],
      [
        12,
        4
      ],
      [
        13,
        4
      ],
      [
        13,
        3
      ],
      [
        13,
        2
      ],
      [
        13,
        1
      ]
    ],
    "moves": [
      {
        "x": 13,
        "y": 0,
        "color": 1,
        "replies": [
          {
            "x": 15,
            "y": 1,
            "color": 2,
            "replies": [
              {
                "x": 11,
                "y": 1,
                "color": 1,
                "replies": [
                  {
                    "x": 12,
                    "y": 0,
                    "color": 2,
                    "replies": [
                      {
                        "x": 10,
                        "y": 2,
                        "color": 1,
                        "replies": [
                          {
                            "x": 10,
                            "y": 0,
                            "color": 2,
                            "replies": [
                              {
                                "x": 9,
                                "y": 0,
                                "color": 1,
                                "replies": []
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "tactic-6-04",
    "track": "tactic",
    "level": 6,
    "title": "玄玄棋经 · 4",
    "prompt": "白先。玄玄棋经是高段死活。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "玄玄棋经（约 1349，公有领域；SGF：Jean-Pierre Vesinet）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        1,
        18
      ],
      [
        1,
        17
      ],
      [
        1,
        14
      ],
      [
        1,
        13
      ],
      [
        3,
        15
      ],
      [
        3,
        16
      ]
    ],
    "white": [
      [
        1,
        12
      ],
      [
        2,
        12
      ],
      [
        3,
        13
      ],
      [
        3,
        14
      ],
      [
        4,
        15
      ],
      [
        4,
        16
      ],
      [
        4,
        17
      ],
      [
        3,
        17
      ]
    ],
    "moves": [
      {
        "x": 1,
        "y": 16,
        "color": 2,
        "replies": [
          {
            "x": 2,
            "y": 15,
            "color": 1,
            "replies": [
              {
                "x": 2,
                "y": 17,
                "color": 2,
                "replies": [
                  {
                    "x": 2,
                    "y": 16,
                    "color": 1,
                    "replies": [
                      {
                        "x": 0,
                        "y": 17,
                        "color": 2,
                        "replies": [
                          {
                            "x": 1,
                            "y": 15,
                            "color": 1,
                            "replies": [
                              {
                                "x": 0,
                                "y": 16,
                                "color": 2,
                                "replies": [
                                  {
                                    "x": 0,
                                    "y": 15,
                                    "color": 1,
                                    "replies": [
                                      {
                                        "x": 0,
                                        "y": 13,
                                        "color": 2,
                                        "replies": []
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      },
                      {
                        "x": 0,
                        "y": 16,
                        "color": 2,
                        "replies": [
                          {
                            "x": 1,
                            "y": 15,
                            "color": 1,
                            "replies": [
                              {
                                "x": 0,
                                "y": 17,
                                "color": 2,
                                "replies": [
                                  {
                                    "x": 0,
                                    "y": 15,
                                    "color": 1,
                                    "replies": [
                                      {
                                        "x": 0,
                                        "y": 13,
                                        "color": 2,
                                        "replies": []
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                "x": 0,
                "y": 15,
                "color": 2,
                "replies": [
                  {
                    "x": 1,
                    "y": 15,
                    "color": 1,
                    "replies": [
                      {
                        "x": 0,
                        "y": 17,
                        "color": 2,
                        "replies": []
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "x": 0,
        "y": 13,
        "color": 2,
        "replies": [
          {
            "x": 2,
            "y": 15,
            "color": 1,
            "replies": [
              {
                "x": 0,
                "y": 15,
                "color": 2,
                "replies": [
                  {
                    "x": 0,
                    "y": 14,
                    "color": 1,
                    "replies": [
                      {
                        "x": 1,
                        "y": 16,
                        "color": 2,
                        "replies": [
                          {
                            "x": 1,
                            "y": 15,
                            "color": 1,
                            "replies": [
                              {
                                "x": 0,
                                "y": 17,
                                "color": 2,
                                "replies": [
                                  {
                                    "x": 0,
                                    "y": 16,
                                    "color": 1,
                                    "replies": []
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "tactic-6-05",
    "track": "tactic",
    "level": 6,
    "title": "玄玄棋经 · 5",
    "prompt": "黑先。玄玄棋经是高段死活。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "玄玄棋经（约 1349，公有领域；SGF：Jean-Pierre Vesinet）",
    "size": 19,
    "toPlay": 1,
    "black": [
      [
        15,
        1
      ],
      [
        16,
        2
      ],
      [
        15,
        3
      ],
      [
        13,
        4
      ],
      [
        12,
        4
      ],
      [
        11,
        3
      ],
      [
        12,
        2
      ],
      [
        12,
        1
      ],
      [
        10,
        3
      ],
      [
        9,
        3
      ],
      [
        8,
        2
      ],
      [
        7,
        2
      ],
      [
        6,
        1
      ],
      [
        5,
        2
      ]
    ],
    "white": [
      [
        13,
        1
      ],
      [
        13,
        2
      ],
      [
        13,
        3
      ],
      [
        12,
        3
      ],
      [
        11,
        2
      ],
      [
        10,
        2
      ],
      [
        9,
        2
      ],
      [
        8,
        1
      ],
      [
        7,
        1
      ]
    ],
    "moves": [
      {
        "x": 9,
        "y": 1,
        "color": 1,
        "replies": [
          {
            "x": 10,
            "y": 1,
            "color": 2,
            "replies": [
              {
                "x": 9,
                "y": 0,
                "color": 1,
                "replies": [
                  {
                    "x": 10,
                    "y": 0,
                    "color": 2,
                    "replies": [
                      {
                        "x": 13,
                        "y": 0,
                        "color": 1,
                        "replies": [
                          {
                            "x": 14,
                            "y": 0,
                            "color": 2,
                            "replies": [
                              {
                                "x": 12,
                                "y": 0,
                                "color": 1,
                                "replies": [
                                  {
                                    "x": 14,
                                    "y": 1,
                                    "color": 2,
                                    "replies": [
                                      {
                                        "x": 14,
                                        "y": 3,
                                        "color": 1,
                                        "replies": []
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "tactic-6-06",
    "track": "tactic",
    "level": 6,
    "title": "玄玄棋经 · 6",
    "prompt": "白先。玄玄棋经是高段死活。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "玄玄棋经（约 1349，公有领域；SGF：Jean-Pierre Vesinet）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        15,
        0
      ],
      [
        14,
        1
      ],
      [
        16,
        1
      ],
      [
        16,
        2
      ],
      [
        15,
        3
      ],
      [
        15,
        4
      ],
      [
        14,
        5
      ],
      [
        13,
        5
      ],
      [
        12,
        5
      ],
      [
        11,
        4
      ],
      [
        11,
        3
      ],
      [
        11,
        2
      ],
      [
        11,
        1
      ]
    ],
    "white": [
      [
        13,
        1
      ],
      [
        13,
        2
      ],
      [
        14,
        2
      ],
      [
        15,
        2
      ],
      [
        15,
        1
      ],
      [
        12,
        3
      ],
      [
        13,
        4
      ],
      [
        14,
        4
      ]
    ],
    "moves": [
      {
        "x": 16,
        "y": 3,
        "color": 2,
        "replies": [
          {
            "x": 16,
            "y": 4,
            "color": 1,
            "replies": [
              {
                "x": 17,
                "y": 3,
                "color": 2,
                "replies": [
                  {
                    "x": 17,
                    "y": 2,
                    "color": 1,
                    "replies": [
                      {
                        "x": 17,
                        "y": 0,
                        "color": 2,
                        "replies": [
                          {
                            "x": 14,
                            "y": 3,
                            "color": 1,
                            "replies": [
                              {
                                "x": 18,
                                "y": 1,
                                "color": 2,
                                "replies": [
                                  {
                                    "x": 18,
                                    "y": 3,
                                    "color": 1,
                                    "replies": [
                                      {
                                        "x": 16,
                                        "y": 0,
                                        "color": 2,
                                        "replies": [
                                          {
                                            "x": 17,
                                            "y": 4,
                                            "color": 1,
                                            "replies": [
                                              {
                                                "x": 17,
                                                "y": 1,
                                                "color": 2,
                                                "replies": []
                                              }
                                            ]
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-1-01",
    "track": "yose",
    "level": 1,
    "title": "官子谱 · 一手官子 1",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        14,
        15
      ],
      [
        14,
        17
      ],
      [
        15,
        15
      ],
      [
        16,
        15
      ],
      [
        17,
        15
      ]
    ],
    "white": [
      [
        17,
        14
      ],
      [
        16,
        13
      ],
      [
        15,
        14
      ],
      [
        14,
        14
      ],
      [
        13,
        15
      ],
      [
        13,
        16
      ],
      [
        13,
        17
      ]
    ],
    "moves": [
      {
        "x": 18,
        "y": 17,
        "color": 2,
        "replies": []
      }
    ]
  },
  {
    "id": "yose-1-02",
    "track": "yose",
    "level": 1,
    "title": "官子谱 · 一手官子 2",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        14,
        17
      ],
      [
        14,
        18
      ],
      [
        16,
        16
      ],
      [
        16,
        17
      ],
      [
        18,
        16
      ],
      [
        18,
        17
      ]
    ],
    "white": [
      [
        18,
        15
      ],
      [
        17,
        15
      ],
      [
        16,
        15
      ],
      [
        15,
        15
      ],
      [
        14,
        16
      ],
      [
        13,
        17
      ],
      [
        12,
        16
      ]
    ],
    "moves": [
      {
        "x": 16,
        "y": 18,
        "color": 2,
        "replies": []
      }
    ]
  },
  {
    "id": "yose-1-03",
    "track": "yose",
    "level": 1,
    "title": "官子谱 · 一手官子 3",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        2,
        16
      ],
      [
        2,
        15
      ],
      [
        1,
        15
      ],
      [
        0,
        14
      ],
      [
        1,
        13
      ],
      [
        3,
        13
      ],
      [
        3,
        12
      ],
      [
        2,
        11
      ]
    ],
    "white": [
      [
        0,
        16
      ],
      [
        0,
        15
      ],
      [
        1,
        16
      ],
      [
        2,
        17
      ],
      [
        1,
        18
      ],
      [
        3,
        16
      ],
      [
        3,
        15
      ],
      [
        3,
        14
      ]
    ],
    "moves": [
      {
        "x": 2,
        "y": 13,
        "color": 2,
        "replies": []
      }
    ]
  },
  {
    "id": "yose-1-04",
    "track": "yose",
    "level": 1,
    "title": "官子谱 · 一手官子 4",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        5,
        2
      ],
      [
        6,
        2
      ],
      [
        7,
        1
      ],
      [
        4,
        4
      ],
      [
        2,
        5
      ],
      [
        1,
        5
      ],
      [
        1,
        2
      ],
      [
        1,
        1
      ],
      [
        3,
        1
      ],
      [
        3,
        0
      ]
    ],
    "white": [
      [
        1,
        4
      ],
      [
        1,
        3
      ],
      [
        2,
        3
      ],
      [
        3,
        3
      ],
      [
        3,
        2
      ],
      [
        4,
        1
      ],
      [
        5,
        1
      ]
    ],
    "moves": [
      {
        "x": 1,
        "y": 0,
        "color": 2,
        "replies": []
      }
    ]
  },
  {
    "id": "yose-1-05",
    "track": "yose",
    "level": 1,
    "title": "官子谱 · 一手官子 5",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        15,
        3
      ],
      [
        15,
        4
      ],
      [
        15,
        2
      ],
      [
        16,
        1
      ],
      [
        16,
        3
      ],
      [
        17,
        3
      ]
    ],
    "white": [
      [
        15,
        1
      ],
      [
        14,
        0
      ],
      [
        13,
        1
      ],
      [
        14,
        2
      ],
      [
        14,
        3
      ],
      [
        13,
        4
      ],
      [
        14,
        5
      ],
      [
        15,
        5
      ],
      [
        16,
        4
      ],
      [
        17,
        4
      ],
      [
        16,
        6
      ]
    ],
    "moves": [
      {
        "x": 17,
        "y": 0,
        "color": 2,
        "replies": []
      }
    ]
  },
  {
    "id": "yose-1-06",
    "track": "yose",
    "level": 1,
    "title": "官子谱 · 一手官子 6",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        15,
        14
      ],
      [
        14,
        15
      ],
      [
        14,
        16
      ],
      [
        15,
        16
      ],
      [
        16,
        16
      ],
      [
        16,
        15
      ],
      [
        16,
        17
      ],
      [
        14,
        18
      ]
    ],
    "white": [
      [
        17,
        17
      ],
      [
        17,
        16
      ],
      [
        17,
        15
      ],
      [
        16,
        13
      ],
      [
        15,
        13
      ],
      [
        13,
        14
      ],
      [
        13,
        16
      ],
      [
        12,
        16
      ],
      [
        11,
        16
      ],
      [
        10,
        17
      ]
    ],
    "moves": [
      {
        "x": 15,
        "y": 18,
        "color": 2,
        "replies": []
      }
    ]
  },
  {
    "id": "yose-2-01",
    "track": "yose",
    "level": 2,
    "title": "官子谱 · 短收官 1",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        12,
        17
      ],
      [
        12,
        16
      ],
      [
        11,
        16
      ],
      [
        11,
        15
      ],
      [
        11,
        14
      ],
      [
        12,
        14
      ],
      [
        13,
        15
      ],
      [
        14,
        15
      ],
      [
        15,
        16
      ],
      [
        15,
        17
      ]
    ],
    "white": [
      [
        16,
        17
      ],
      [
        16,
        16
      ],
      [
        15,
        15
      ],
      [
        16,
        14
      ],
      [
        14,
        14
      ],
      [
        13,
        14
      ],
      [
        12,
        13
      ],
      [
        11,
        13
      ],
      [
        10,
        14
      ],
      [
        10,
        15
      ],
      [
        10,
        16
      ],
      [
        10,
        17
      ],
      [
        11,
        17
      ]
    ],
    "moves": [
      {
        "x": 13,
        "y": 17,
        "color": 2,
        "replies": [
          {
            "x": 14,
            "y": 18,
            "color": 1,
            "replies": []
          }
        ]
      }
    ]
  },
  {
    "id": "yose-2-02",
    "track": "yose",
    "level": 2,
    "title": "官子谱 · 短收官 2",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        5,
        2
      ],
      [
        6,
        3
      ],
      [
        5,
        5
      ],
      [
        3,
        5
      ],
      [
        2,
        5
      ],
      [
        2,
        3
      ],
      [
        1,
        3
      ],
      [
        1,
        2
      ]
    ],
    "white": [
      [
        2,
        2
      ],
      [
        3,
        2
      ],
      [
        3,
        3
      ],
      [
        3,
        4
      ],
      [
        7,
        3
      ],
      [
        7,
        2
      ],
      [
        9,
        2
      ]
    ],
    "moves": [
      {
        "x": 5,
        "y": 3,
        "color": 2,
        "replies": [
          {
            "x": 4,
            "y": 3,
            "color": 1,
            "replies": [
              {
                "x": 5,
                "y": 1,
                "color": 2,
                "replies": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-2-03",
    "track": "yose",
    "level": 2,
    "title": "官子谱 · 短收官 3",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        3,
        11
      ],
      [
        2,
        11
      ],
      [
        1,
        10
      ],
      [
        1,
        12
      ],
      [
        2,
        13
      ],
      [
        2,
        14
      ],
      [
        2,
        15
      ],
      [
        2,
        16
      ],
      [
        1,
        16
      ]
    ],
    "white": [
      [
        0,
        17
      ],
      [
        1,
        17
      ],
      [
        2,
        17
      ],
      [
        3,
        16
      ],
      [
        3,
        15
      ],
      [
        3,
        14
      ],
      [
        3,
        13
      ],
      [
        3,
        12
      ],
      [
        2,
        12
      ]
    ],
    "moves": [
      {
        "x": 0,
        "y": 14,
        "color": 2,
        "replies": [
          {
            "x": 0,
            "y": 13,
            "color": 1,
            "replies": [
              {
                "x": 0,
                "y": 16,
                "color": 2,
                "replies": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-2-04",
    "track": "yose",
    "level": 2,
    "title": "官子谱 · 短收官 4",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        16,
        2
      ],
      [
        16,
        1
      ],
      [
        15,
        1
      ],
      [
        15,
        3
      ],
      [
        15,
        4
      ],
      [
        16,
        4
      ],
      [
        16,
        5
      ],
      [
        17,
        5
      ]
    ],
    "white": [
      [
        15,
        2
      ],
      [
        14,
        2
      ],
      [
        14,
        1
      ],
      [
        13,
        3
      ],
      [
        14,
        5
      ],
      [
        14,
        7
      ],
      [
        16,
        7
      ],
      [
        17,
        7
      ],
      [
        16,
        3
      ],
      [
        17,
        3
      ],
      [
        17,
        4
      ]
    ],
    "moves": [
      {
        "x": 17,
        "y": 0,
        "color": 2,
        "replies": [
          {
            "x": 17,
            "y": 2,
            "color": 1,
            "replies": [
              {
                "x": 15,
                "y": 0,
                "color": 2,
                "replies": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-2-05",
    "track": "yose",
    "level": 2,
    "title": "官子谱 · 短收官 5",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        16,
        5
      ],
      [
        17,
        5
      ],
      [
        18,
        5
      ],
      [
        18,
        4
      ],
      [
        17,
        7
      ],
      [
        16,
        9
      ],
      [
        16,
        8
      ],
      [
        17,
        10
      ]
    ],
    "white": [
      [
        18,
        3
      ],
      [
        17,
        3
      ],
      [
        17,
        4
      ],
      [
        16,
        4
      ],
      [
        15,
        5
      ],
      [
        15,
        6
      ],
      [
        15,
        7
      ],
      [
        15,
        8
      ],
      [
        15,
        9
      ],
      [
        16,
        10
      ],
      [
        16,
        11
      ],
      [
        17,
        13
      ],
      [
        15,
        13
      ]
    ],
    "moves": [
      {
        "x": 17,
        "y": 9,
        "color": 2,
        "replies": [
          {
            "x": 17,
            "y": 8,
            "color": 1,
            "replies": [
              {
                "x": 18,
                "y": 7,
                "color": 2,
                "replies": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-2-06",
    "track": "yose",
    "level": 2,
    "title": "官子谱 · 短收官 6",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        13,
        17
      ],
      [
        15,
        17
      ],
      [
        16,
        17
      ],
      [
        16,
        16
      ],
      [
        17,
        15
      ],
      [
        17,
        14
      ],
      [
        16,
        12
      ],
      [
        15,
        12
      ],
      [
        13,
        12
      ],
      [
        12,
        13
      ],
      [
        12,
        15
      ],
      [
        11,
        15
      ],
      [
        10,
        15
      ],
      [
        10,
        16
      ]
    ],
    "white": [
      [
        15,
        16
      ],
      [
        15,
        15
      ],
      [
        16,
        14
      ],
      [
        15,
        13
      ],
      [
        14,
        13
      ],
      [
        13,
        14
      ],
      [
        13,
        15
      ],
      [
        12,
        16
      ],
      [
        11,
        16
      ],
      [
        14,
        17
      ]
    ],
    "moves": [
      {
        "x": 14,
        "y": 18,
        "color": 2,
        "replies": [
          {
            "x": 13,
            "y": 16,
            "color": 1,
            "replies": [
              {
                "x": 12,
                "y": 18,
                "color": 2,
                "replies": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-3-01",
    "track": "yose",
    "level": 3,
    "title": "官子谱 · 三手前后 1",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        3,
        3
      ],
      [
        4,
        3
      ],
      [
        6,
        2
      ],
      [
        2,
        4
      ],
      [
        1,
        4
      ],
      [
        1,
        5
      ],
      [
        3,
        5
      ],
      [
        3,
        6
      ],
      [
        2,
        7
      ]
    ],
    "white": [
      [
        2,
        2
      ],
      [
        2,
        3
      ],
      [
        3,
        4
      ],
      [
        4,
        4
      ],
      [
        4,
        5
      ],
      [
        4,
        7
      ],
      [
        4,
        6
      ],
      [
        2,
        5
      ]
    ],
    "moves": [
      {
        "x": 5,
        "y": 3,
        "color": 2,
        "replies": [
          {
            "x": 3,
            "y": 1,
            "color": 1,
            "replies": [
              {
                "x": 4,
                "y": 1,
                "color": 2,
                "replies": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-3-02",
    "track": "yose",
    "level": 3,
    "title": "官子谱 · 三手前后 2",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        17,
        0
      ],
      [
        17,
        1
      ],
      [
        18,
        1
      ],
      [
        16,
        2
      ],
      [
        16,
        3
      ],
      [
        16,
        4
      ],
      [
        15,
        2
      ],
      [
        14,
        3
      ],
      [
        15,
        5
      ],
      [
        13,
        5
      ],
      [
        17,
        5
      ],
      [
        17,
        6
      ],
      [
        16,
        7
      ]
    ],
    "white": [
      [
        16,
        5
      ],
      [
        16,
        6
      ],
      [
        17,
        4
      ],
      [
        17,
        3
      ],
      [
        17,
        2
      ],
      [
        16,
        1
      ],
      [
        15,
        1
      ],
      [
        14,
        1
      ],
      [
        14,
        2
      ],
      [
        13,
        2
      ],
      [
        15,
        6
      ],
      [
        14,
        6
      ]
    ],
    "moves": [
      {
        "x": 13,
        "y": 4,
        "color": 2,
        "replies": [
          {
            "x": 14,
            "y": 4,
            "color": 1,
            "replies": [
              {
                "x": 14,
                "y": 5,
                "color": 2,
                "replies": []
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-3-03",
    "track": "yose",
    "level": 3,
    "title": "官子谱 · 三手前后 3",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        15,
        3
      ],
      [
        15,
        4
      ],
      [
        16,
        4
      ],
      [
        17,
        4
      ],
      [
        18,
        4
      ],
      [
        14,
        3
      ],
      [
        14,
        2
      ],
      [
        13,
        1
      ],
      [
        13,
        0
      ],
      [
        14,
        1
      ],
      [
        17,
        1
      ]
    ],
    "white": [
      [
        16,
        2
      ],
      [
        15,
        2
      ],
      [
        13,
        2
      ],
      [
        13,
        3
      ],
      [
        12,
        1
      ],
      [
        12,
        0
      ],
      [
        11,
        2
      ],
      [
        14,
        4
      ],
      [
        13,
        5
      ],
      [
        15,
        5
      ],
      [
        16,
        5
      ],
      [
        17,
        5
      ],
      [
        18,
        5
      ]
    ],
    "moves": [
      {
        "x": 17,
        "y": 2,
        "color": 2,
        "replies": [
          {
            "x": 16,
            "y": 1,
            "color": 1,
            "replies": [
              {
                "x": 15,
                "y": 1,
                "color": 2,
                "replies": [
                  {
                    "x": 18,
                    "y": 1,
                    "color": 1,
                    "replies": []
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-3-04",
    "track": "yose",
    "level": 3,
    "title": "官子谱 · 三手前后 4",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        5,
        1
      ],
      [
        5,
        0
      ],
      [
        4,
        2
      ],
      [
        3,
        2
      ],
      [
        2,
        2
      ],
      [
        2,
        3
      ],
      [
        1,
        1
      ],
      [
        1,
        4
      ]
    ],
    "white": [
      [
        1,
        2
      ],
      [
        1,
        3
      ],
      [
        1,
        5
      ],
      [
        2,
        4
      ],
      [
        3,
        5
      ],
      [
        3,
        3
      ],
      [
        4,
        3
      ],
      [
        5,
        2
      ],
      [
        6,
        2
      ],
      [
        6,
        1
      ]
    ],
    "moves": [
      {
        "x": 1,
        "y": 0,
        "color": 2,
        "replies": [
          {
            "x": 0,
            "y": 2,
            "color": 1,
            "replies": [
              {
                "x": 0,
                "y": 4,
                "color": 2,
                "replies": [
                  {
                    "x": 2,
                    "y": 0,
                    "color": 1,
                    "replies": [
                      {
                        "x": 3,
                        "y": 0,
                        "color": 2,
                        "replies": []
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-3-05",
    "track": "yose",
    "level": 3,
    "title": "官子谱 · 三手前后 5",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        7,
        3
      ],
      [
        7,
        2
      ],
      [
        7,
        1
      ],
      [
        5,
        2
      ],
      [
        4,
        2
      ],
      [
        3,
        2
      ],
      [
        2,
        1
      ],
      [
        2,
        0
      ]
    ],
    "white": [
      [
        1,
        0
      ],
      [
        1,
        1
      ],
      [
        1,
        2
      ],
      [
        3,
        3
      ],
      [
        2,
        3
      ],
      [
        4,
        3
      ],
      [
        5,
        3
      ],
      [
        6,
        4
      ],
      [
        7,
        4
      ],
      [
        8,
        3
      ],
      [
        8,
        2
      ],
      [
        8,
        1
      ],
      [
        10,
        1
      ]
    ],
    "moves": [
      {
        "x": 3,
        "y": 1,
        "color": 2,
        "replies": [
          {
            "x": 3,
            "y": 0,
            "color": 1,
            "replies": [
              {
                "x": 7,
                "y": 0,
                "color": 2,
                "replies": [
                  {
                    "x": 6,
                    "y": 0,
                    "color": 1,
                    "replies": [
                      {
                        "x": 6,
                        "y": 1,
                        "color": 2,
                        "replies": []
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-3-06",
    "track": "yose",
    "level": 3,
    "title": "官子谱 · 三手前后 6",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        11,
        16
      ],
      [
        11,
        17
      ],
      [
        11,
        18
      ],
      [
        13,
        17
      ],
      [
        13,
        16
      ],
      [
        13,
        15
      ],
      [
        14,
        15
      ],
      [
        15,
        17
      ],
      [
        16,
        16
      ],
      [
        17,
        16
      ],
      [
        17,
        17
      ]
    ],
    "white": [
      [
        17,
        15
      ],
      [
        17,
        14
      ],
      [
        15,
        15
      ],
      [
        15,
        14
      ],
      [
        14,
        14
      ],
      [
        13,
        14
      ],
      [
        12,
        14
      ],
      [
        11,
        15
      ],
      [
        10,
        14
      ],
      [
        10,
        16
      ],
      [
        10,
        17
      ],
      [
        10,
        18
      ],
      [
        14,
        16
      ],
      [
        14,
        17
      ]
    ],
    "moves": [
      {
        "x": 12,
        "y": 16,
        "color": 2,
        "replies": [
          {
            "x": 12,
            "y": 17,
            "color": 1,
            "replies": [
              {
                "x": 15,
                "y": 16,
                "color": 2,
                "replies": [
                  {
                    "x": 14,
                    "y": 18,
                    "color": 1,
                    "replies": [
                      {
                        "x": 13,
                        "y": 18,
                        "color": 2,
                        "replies": []
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-4-01",
    "track": "yose",
    "level": 4,
    "title": "官子谱 · 局部收官 1",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        3,
        3
      ],
      [
        2,
        3
      ],
      [
        1,
        3
      ],
      [
        4,
        1
      ],
      [
        4,
        2
      ],
      [
        6,
        1
      ],
      [
        5,
        0
      ]
    ],
    "white": [
      [
        1,
        4
      ],
      [
        2,
        4
      ],
      [
        3,
        4
      ],
      [
        1,
        6
      ],
      [
        4,
        3
      ],
      [
        5,
        3
      ],
      [
        5,
        2
      ],
      [
        5,
        1
      ],
      [
        7,
        2
      ],
      [
        8,
        1
      ]
    ],
    "moves": [
      {
        "x": 0,
        "y": 1,
        "color": 2,
        "replies": [
          {
            "x": 1,
            "y": 2,
            "color": 1,
            "replies": [
              {
                "x": 3,
                "y": 2,
                "color": 2,
                "replies": [
                  {
                    "x": 3,
                    "y": 1,
                    "color": 1,
                    "replies": [
                      {
                        "x": 1,
                        "y": 1,
                        "color": 2,
                        "replies": []
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-4-02",
    "track": "yose",
    "level": 4,
    "title": "官子谱 · 局部收官 2",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        1,
        8
      ],
      [
        1,
        9
      ],
      [
        2,
        10
      ],
      [
        2,
        11
      ],
      [
        2,
        13
      ],
      [
        2,
        14
      ],
      [
        3,
        12
      ],
      [
        1,
        15
      ],
      [
        1,
        16
      ],
      [
        1,
        12
      ]
    ],
    "white": [
      [
        1,
        17
      ],
      [
        2,
        17
      ],
      [
        2,
        15
      ],
      [
        3,
        15
      ],
      [
        3,
        14
      ],
      [
        3,
        13
      ],
      [
        4,
        12
      ],
      [
        1,
        14
      ],
      [
        3,
        11
      ],
      [
        3,
        10
      ],
      [
        2,
        9
      ],
      [
        2,
        8
      ],
      [
        2,
        7
      ],
      [
        1,
        7
      ]
    ],
    "moves": [
      {
        "x": 1,
        "y": 10,
        "color": 2,
        "replies": [
          {
            "x": 1,
            "y": 11,
            "color": 1,
            "replies": [
              {
                "x": 1,
                "y": 13,
                "color": 2,
                "replies": [
                  {
                    "x": 2,
                    "y": 12,
                    "color": 1,
                    "replies": [
                      {
                        "x": 0,
                        "y": 10,
                        "color": 2,
                        "replies": []
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-4-03",
    "track": "yose",
    "level": 4,
    "title": "官子谱 · 局部收官 3",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        3,
        1
      ],
      [
        3,
        2
      ],
      [
        3,
        3
      ],
      [
        4,
        4
      ],
      [
        5,
        3
      ],
      [
        5,
        4
      ],
      [
        3,
        6
      ],
      [
        2,
        6
      ],
      [
        1,
        5
      ]
    ],
    "white": [
      [
        1,
        6
      ],
      [
        2,
        7
      ],
      [
        2,
        8
      ],
      [
        1,
        8
      ],
      [
        0,
        7
      ],
      [
        4,
        1
      ],
      [
        4,
        2
      ],
      [
        4,
        3
      ],
      [
        5,
        2
      ],
      [
        6,
        3
      ],
      [
        6,
        4
      ],
      [
        7,
        2
      ]
    ],
    "moves": [
      {
        "x": 1,
        "y": 4,
        "color": 2,
        "replies": [
          {
            "x": 2,
            "y": 4,
            "color": 1,
            "replies": [
              {
                "x": 0,
                "y": 5,
                "color": 2,
                "replies": [
                  {
                    "x": 1,
                    "y": 3,
                    "color": 1,
                    "replies": [
                      {
                        "x": 2,
                        "y": 5,
                        "color": 2,
                        "replies": [
                          {
                            "x": 3,
                            "y": 5,
                            "color": 1,
                            "replies": []
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-4-04",
    "track": "yose",
    "level": 4,
    "title": "官子谱 · 局部收官 4",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        16,
        15
      ],
      [
        17,
        14
      ],
      [
        18,
        14
      ],
      [
        17,
        16
      ],
      [
        15,
        16
      ],
      [
        14,
        16
      ],
      [
        14,
        17
      ],
      [
        14,
        18
      ]
    ],
    "white": [
      [
        15,
        15
      ],
      [
        14,
        15
      ],
      [
        13,
        16
      ],
      [
        13,
        17
      ],
      [
        13,
        18
      ],
      [
        13,
        13
      ],
      [
        16,
        14
      ],
      [
        16,
        13
      ],
      [
        17,
        13
      ],
      [
        18,
        13
      ]
    ],
    "moves": [
      {
        "x": 16,
        "y": 17,
        "color": 2,
        "replies": [
          {
            "x": 16,
            "y": 16,
            "color": 1,
            "replies": [
              {
                "x": 18,
                "y": 17,
                "color": 2,
                "replies": [
                  {
                    "x": 17,
                    "y": 17,
                    "color": 1,
                    "replies": [
                      {
                        "x": 18,
                        "y": 16,
                        "color": 2,
                        "replies": [
                          {
                            "x": 17,
                            "y": 15,
                            "color": 1,
                            "replies": [
                              {
                                "x": 17,
                                "y": 18,
                                "color": 2,
                                "replies": []
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-4-05",
    "track": "yose",
    "level": 4,
    "title": "官子谱 · 局部收官 5",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        16,
        12
      ],
      [
        15,
        12
      ],
      [
        17,
        13
      ],
      [
        17,
        11
      ],
      [
        17,
        10
      ],
      [
        16,
        9
      ],
      [
        15,
        9
      ],
      [
        15,
        8
      ],
      [
        15,
        7
      ],
      [
        16,
        6
      ],
      [
        16,
        5
      ],
      [
        17,
        5
      ],
      [
        18,
        5
      ]
    ],
    "white": [
      [
        18,
        4
      ],
      [
        17,
        4
      ],
      [
        16,
        4
      ],
      [
        15,
        5
      ],
      [
        15,
        6
      ],
      [
        14,
        7
      ],
      [
        14,
        8
      ],
      [
        14,
        9
      ],
      [
        15,
        10
      ],
      [
        16,
        10
      ],
      [
        16,
        11
      ],
      [
        14,
        11
      ],
      [
        17,
        12
      ]
    ],
    "moves": [
      {
        "x": 17,
        "y": 9,
        "color": 2,
        "replies": [
          {
            "x": 16,
            "y": 7,
            "color": 1,
            "replies": [
              {
                "x": 18,
                "y": 10,
                "color": 2,
                "replies": [
                  {
                    "x": 18,
                    "y": 12,
                    "color": 1,
                    "replies": [
                      {
                        "x": 17,
                        "y": 7,
                        "color": 2,
                        "replies": [
                          {
                            "x": 17,
                            "y": 8,
                            "color": 1,
                            "replies": [
                              {
                                "x": 18,
                                "y": 8,
                                "color": 2,
                                "replies": []
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-4-06",
    "track": "yose",
    "level": 4,
    "title": "官子谱 · 局部收官 6",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        1,
        4
      ],
      [
        1,
        3
      ],
      [
        3,
        3
      ],
      [
        3,
        2
      ],
      [
        2,
        1
      ],
      [
        5,
        2
      ],
      [
        5,
        1
      ]
    ],
    "white": [
      [
        3,
        1
      ],
      [
        5,
        3
      ],
      [
        6,
        2
      ],
      [
        6,
        1
      ],
      [
        7,
        3
      ],
      [
        4,
        4
      ],
      [
        3,
        4
      ],
      [
        2,
        4
      ],
      [
        1,
        5
      ],
      [
        2,
        6
      ]
    ],
    "moves": [
      {
        "x": 2,
        "y": 2,
        "color": 2,
        "replies": [
          {
            "x": 2,
            "y": 3,
            "color": 1,
            "replies": [
              {
                "x": 4,
                "y": 0,
                "color": 2,
                "replies": [
                  {
                    "x": 4,
                    "y": 2,
                    "color": 1,
                    "replies": [
                      {
                        "x": 5,
                        "y": 0,
                        "color": 2,
                        "replies": [
                          {
                            "x": 2,
                            "y": 0,
                            "color": 1,
                            "replies": [
                              {
                                "x": 3,
                                "y": 0,
                                "color": 2,
                                "replies": [
                                  {
                                    "x": 0,
                                    "y": 4,
                                    "color": 1,
                                    "replies": []
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-5-01",
    "track": "yose",
    "level": 5,
    "title": "官子谱 · 进阶官子 1",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        2,
        1
      ],
      [
        3,
        1
      ],
      [
        4,
        2
      ],
      [
        5,
        2
      ],
      [
        6,
        3
      ],
      [
        7,
        3
      ],
      [
        8,
        2
      ],
      [
        9,
        2
      ],
      [
        9,
        1
      ],
      [
        6,
        1
      ]
    ],
    "white": [
      [
        1,
        1
      ],
      [
        1,
        2
      ],
      [
        2,
        2
      ],
      [
        3,
        2
      ],
      [
        4,
        3
      ],
      [
        5,
        3
      ],
      [
        6,
        4
      ],
      [
        7,
        4
      ],
      [
        9,
        4
      ],
      [
        9,
        3
      ],
      [
        10,
        2
      ],
      [
        10,
        1
      ],
      [
        7,
        1
      ]
    ],
    "moves": [
      {
        "x": 8,
        "y": 0,
        "color": 2,
        "replies": [
          {
            "x": 9,
            "y": 0,
            "color": 1,
            "replies": [
              {
                "x": 4,
                "y": 1,
                "color": 2,
                "replies": [
                  {
                    "x": 5,
                    "y": 1,
                    "color": 1,
                    "replies": [
                      {
                        "x": 4,
                        "y": 0,
                        "color": 2,
                        "replies": [
                          {
                            "x": 8,
                            "y": 1,
                            "color": 1,
                            "replies": [
                              {
                                "x": 6,
                                "y": 0,
                                "color": 2,
                                "replies": [
                                  {
                                    "x": 7,
                                    "y": 2,
                                    "color": 1,
                                    "replies": []
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-5-02",
    "track": "yose",
    "level": 5,
    "title": "官子谱 · 进阶官子 2",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        3,
        5
      ],
      [
        3,
        4
      ],
      [
        3,
        3
      ],
      [
        1,
        4
      ],
      [
        1,
        2
      ],
      [
        4,
        2
      ],
      [
        5,
        2
      ],
      [
        5,
        6
      ],
      [
        4,
        6
      ]
    ],
    "white": [
      [
        1,
        1
      ],
      [
        3,
        1
      ],
      [
        3,
        2
      ],
      [
        4,
        3
      ],
      [
        4,
        4
      ],
      [
        4,
        5
      ],
      [
        3,
        6
      ],
      [
        2,
        6
      ],
      [
        2,
        5
      ]
    ],
    "moves": [
      {
        "x": 1,
        "y": 3,
        "color": 2,
        "replies": [
          {
            "x": 2,
            "y": 4,
            "color": 1,
            "replies": [
              {
                "x": 1,
                "y": 5,
                "color": 2,
                "replies": [
                  {
                    "x": 2,
                    "y": 3,
                    "color": 1,
                    "replies": [
                      {
                        "x": 2,
                        "y": 2,
                        "color": 2,
                        "replies": [
                          {
                            "x": 0,
                            "y": 3,
                            "color": 1,
                            "replies": [
                              {
                                "x": 0,
                                "y": 5,
                                "color": 2,
                                "replies": [
                                  {
                                    "x": 0,
                                    "y": 4,
                                    "color": 1,
                                    "replies": [
                                      {
                                        "x": 0,
                                        "y": 1,
                                        "color": 2,
                                        "replies": []
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-5-03",
    "track": "yose",
    "level": 5,
    "title": "官子谱 · 进阶官子 3",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        17,
        6
      ],
      [
        16,
        6
      ],
      [
        15,
        6
      ],
      [
        15,
        7
      ],
      [
        15,
        9
      ],
      [
        16,
        9
      ],
      [
        15,
        10
      ],
      [
        15,
        11
      ],
      [
        14,
        12
      ],
      [
        13,
        11
      ],
      [
        13,
        10
      ],
      [
        14,
        9
      ]
    ],
    "white": [
      [
        17,
        3
      ],
      [
        17,
        5
      ],
      [
        16,
        5
      ],
      [
        15,
        5
      ],
      [
        14,
        6
      ],
      [
        14,
        7
      ],
      [
        14,
        8
      ],
      [
        12,
        9
      ],
      [
        11,
        11
      ],
      [
        12,
        12
      ],
      [
        13,
        14
      ],
      [
        15,
        13
      ],
      [
        16,
        12
      ],
      [
        16,
        11
      ],
      [
        17,
        13
      ]
    ],
    "moves": [
      {
        "x": 17,
        "y": 8,
        "color": 2,
        "replies": [
          {
            "x": 17,
            "y": 9,
            "color": 1,
            "replies": [
              {
                "x": 18,
                "y": 6,
                "color": 2,
                "replies": [
                  {
                    "x": 18,
                    "y": 7,
                    "color": 1,
                    "replies": [
                      {
                        "x": 18,
                        "y": 8,
                        "color": 2,
                        "replies": [
                          {
                            "x": 18,
                            "y": 5,
                            "color": 1,
                            "replies": [
                              {
                                "x": 16,
                                "y": 8,
                                "color": 2,
                                "replies": [
                                  {
                                    "x": 15,
                                    "y": 8,
                                    "color": 1,
                                    "replies": [
                                      {
                                        "x": 18,
                                        "y": 9,
                                        "color": 2,
                                        "replies": []
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-5-04",
    "track": "yose",
    "level": 5,
    "title": "官子谱 · 进阶官子 4",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        1,
        16
      ],
      [
        0,
        15
      ],
      [
        0,
        14
      ],
      [
        1,
        14
      ],
      [
        2,
        15
      ],
      [
        2,
        17
      ],
      [
        3,
        16
      ],
      [
        4,
        17
      ],
      [
        4,
        18
      ]
    ],
    "white": [
      [
        3,
        15
      ],
      [
        4,
        14
      ],
      [
        2,
        14
      ],
      [
        2,
        13
      ],
      [
        1,
        13
      ],
      [
        0,
        13
      ],
      [
        4,
        16
      ],
      [
        5,
        16
      ],
      [
        5,
        17
      ],
      [
        5,
        18
      ],
      [
        1,
        17
      ]
    ],
    "moves": [
      {
        "x": 0,
        "y": 18,
        "color": 2,
        "replies": [
          {
            "x": 0,
            "y": 16,
            "color": 1,
            "replies": [
              {
                "x": 3,
                "y": 17,
                "color": 2,
                "replies": [
                  {
                    "x": 3,
                    "y": 18,
                    "color": 1,
                    "replies": [
                      {
                        "x": 2,
                        "y": 18,
                        "color": 2,
                        "replies": [
                          {
                            "x": 0,
                            "y": 17,
                            "color": 1,
                            "replies": [
                              {
                                "x": 3,
                                "y": 17,
                                "color": 2,
                                "replies": [
                                  {
                                    "x": 1,
                                    "y": 18,
                                    "color": 1,
                                    "replies": [
                                      {
                                        "x": 3,
                                        "y": 18,
                                        "color": 2,
                                        "replies": [
                                          {
                                            "x": 2,
                                            "y": 16,
                                            "color": 1,
                                            "replies": []
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-5-05",
    "track": "yose",
    "level": 5,
    "title": "官子谱 · 进阶官子 5",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        17,
        17
      ],
      [
        16,
        16
      ],
      [
        15,
        16
      ],
      [
        14,
        15
      ],
      [
        14,
        14
      ],
      [
        15,
        14
      ],
      [
        16,
        14
      ],
      [
        18,
        15
      ]
    ],
    "white": [
      [
        16,
        17
      ],
      [
        15,
        17
      ],
      [
        14,
        17
      ],
      [
        14,
        16
      ],
      [
        13,
        15
      ],
      [
        12,
        16
      ],
      [
        13,
        14
      ],
      [
        14,
        13
      ],
      [
        15,
        13
      ],
      [
        16,
        13
      ],
      [
        17,
        13
      ]
    ],
    "moves": [
      {
        "x": 18,
        "y": 17,
        "color": 2,
        "replies": [
          {
            "x": 17,
            "y": 18,
            "color": 1,
            "replies": [
              {
                "x": 17,
                "y": 15,
                "color": 2,
                "replies": [
                  {
                    "x": 17,
                    "y": 14,
                    "color": 1,
                    "replies": [
                      {
                        "x": 18,
                        "y": 16,
                        "color": 2,
                        "replies": [
                          {
                            "x": 18,
                            "y": 14,
                            "color": 1,
                            "replies": [
                              {
                                "x": 17,
                                "y": 16,
                                "color": 2,
                                "replies": [
                                  {
                                    "x": 16,
                                    "y": 15,
                                    "color": 1,
                                    "replies": [
                                      {
                                        "x": 16,
                                        "y": 18,
                                        "color": 2,
                                        "replies": [
                                          {
                                            "x": 18,
                                            "y": 18,
                                            "color": 1,
                                            "replies": [
                                              {
                                                "x": 17,
                                                "y": 16,
                                                "color": 2,
                                                "replies": []
                                              }
                                            ]
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-5-06",
    "track": "yose",
    "level": 5,
    "title": "官子谱 · 进阶官子 6",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        15,
        9
      ],
      [
        16,
        9
      ],
      [
        16,
        10
      ],
      [
        16,
        11
      ],
      [
        17,
        12
      ],
      [
        17,
        13
      ],
      [
        17,
        14
      ],
      [
        14,
        8
      ],
      [
        14,
        7
      ],
      [
        14,
        6
      ],
      [
        15,
        6
      ],
      [
        16,
        5
      ],
      [
        17,
        5
      ],
      [
        16,
        4
      ],
      [
        16,
        7
      ],
      [
        17,
        7
      ]
    ],
    "white": [
      [
        14,
        1
      ],
      [
        14,
        3
      ],
      [
        15,
        3
      ],
      [
        16,
        3
      ],
      [
        17,
        3
      ],
      [
        17,
        4
      ],
      [
        14,
        5
      ],
      [
        15,
        5
      ],
      [
        13,
        6
      ],
      [
        13,
        7
      ],
      [
        13,
        8
      ],
      [
        14,
        9
      ],
      [
        13,
        10
      ],
      [
        15,
        10
      ],
      [
        15,
        11
      ],
      [
        16,
        12
      ],
      [
        16,
        13
      ],
      [
        16,
        14
      ],
      [
        15,
        15
      ],
      [
        17,
        15
      ],
      [
        15,
        8
      ],
      [
        16,
        8
      ],
      [
        17,
        8
      ]
    ],
    "moves": [
      {
        "x": 17,
        "y": 11,
        "color": 2,
        "replies": [
          {
            "x": 17,
            "y": 10,
            "color": 1,
            "replies": [
              {
                "x": 18,
                "y": 7,
                "color": 2,
                "replies": [
                  {
                    "x": 18,
                    "y": 6,
                    "color": 1,
                    "replies": [
                      {
                        "x": 18,
                        "y": 11,
                        "color": 2,
                        "replies": [
                          {
                            "x": 18,
                            "y": 10,
                            "color": 1,
                            "replies": [
                              {
                                "x": 16,
                                "y": 6,
                                "color": 2,
                                "replies": [
                                  {
                                    "x": 17,
                                    "y": 6,
                                    "color": 1,
                                    "replies": [
                                      {
                                        "x": 15,
                                        "y": 7,
                                        "color": 2,
                                        "replies": [
                                          {
                                            "x": 16,
                                            "y": 6,
                                            "color": 1,
                                            "replies": [
                                              {
                                                "x": 18,
                                                "y": 8,
                                                "color": 2,
                                                "replies": []
                                              }
                                            ]
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-6-01",
    "track": "yose",
    "level": 6,
    "title": "官子谱 · 高段官子 1",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        3,
        11
      ],
      [
        3,
        10
      ],
      [
        3,
        9
      ],
      [
        4,
        9
      ],
      [
        4,
        12
      ],
      [
        4,
        13
      ],
      [
        3,
        13
      ],
      [
        4,
        14
      ],
      [
        6,
        13
      ],
      [
        6,
        14
      ],
      [
        7,
        14
      ],
      [
        7,
        12
      ],
      [
        8,
        12
      ],
      [
        3,
        15
      ],
      [
        2,
        15
      ],
      [
        4,
        16
      ],
      [
        1,
        16
      ]
    ],
    "white": [
      [
        0,
        15
      ],
      [
        1,
        15
      ],
      [
        2,
        14
      ],
      [
        2,
        13
      ],
      [
        2,
        12
      ],
      [
        3,
        12
      ],
      [
        3,
        14
      ],
      [
        4,
        15
      ],
      [
        5,
        15
      ],
      [
        4,
        11
      ],
      [
        4,
        10
      ],
      [
        5,
        11
      ],
      [
        5,
        12
      ],
      [
        6,
        12
      ],
      [
        7,
        11
      ],
      [
        6,
        10
      ]
    ],
    "moves": [
      {
        "x": 4,
        "y": 17,
        "color": 2,
        "replies": [
          {
            "x": 3,
            "y": 16,
            "color": 1,
            "replies": [
              {
                "x": 5,
                "y": 16,
                "color": 2,
                "replies": [
                  {
                    "x": 3,
                    "y": 17,
                    "color": 1,
                    "replies": [
                      {
                        "x": 1,
                        "y": 17,
                        "color": 2,
                        "replies": [
                          {
                            "x": 5,
                            "y": 17,
                            "color": 1,
                            "replies": [
                              {
                                "x": 2,
                                "y": 17,
                                "color": 2,
                                "replies": [
                                  {
                                    "x": 2,
                                    "y": 16,
                                    "color": 1,
                                    "replies": [
                                      {
                                        "x": 0,
                                        "y": 16,
                                        "color": 2,
                                        "replies": [
                                          {
                                            "x": 4,
                                            "y": 18,
                                            "color": 1,
                                            "replies": [
                                              {
                                                "x": 2,
                                                "y": 18,
                                                "color": 2,
                                                "replies": [
                                                  {
                                                    "x": 6,
                                                    "y": 17,
                                                    "color": 1,
                                                    "replies": []
                                                  }
                                                ]
                                              }
                                            ]
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-6-02",
    "track": "yose",
    "level": 6,
    "title": "官子谱 · 高段官子 2",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        2,
        7
      ],
      [
        3,
        6
      ],
      [
        2,
        5
      ],
      [
        3,
        8
      ],
      [
        3,
        9
      ],
      [
        4,
        10
      ],
      [
        4,
        11
      ],
      [
        3,
        12
      ],
      [
        2,
        12
      ],
      [
        2,
        11
      ],
      [
        1,
        11
      ]
    ],
    "white": [
      [
        3,
        13
      ],
      [
        2,
        13
      ],
      [
        1,
        13
      ],
      [
        1,
        12
      ],
      [
        4,
        12
      ],
      [
        5,
        12
      ],
      [
        5,
        11
      ],
      [
        5,
        10
      ],
      [
        4,
        9
      ],
      [
        4,
        8
      ],
      [
        4,
        7
      ],
      [
        3,
        7
      ],
      [
        5,
        5
      ]
    ],
    "moves": [
      {
        "x": 3,
        "y": 10,
        "color": 2,
        "replies": [
          {
            "x": 3,
            "y": 11,
            "color": 1,
            "replies": [
              {
                "x": 1,
                "y": 9,
                "color": 2,
                "replies": [
                  {
                    "x": 2,
                    "y": 10,
                    "color": 1,
                    "replies": [
                      {
                        "x": 2,
                        "y": 8,
                        "color": 2,
                        "replies": [
                          {
                            "x": 2,
                            "y": 9,
                            "color": 1,
                            "replies": [
                              {
                                "x": 1,
                                "y": 8,
                                "color": 2,
                                "replies": [
                                  {
                                    "x": 1,
                                    "y": 7,
                                    "color": 1,
                                    "replies": [
                                      {
                                        "x": 0,
                                        "y": 10,
                                        "color": 2,
                                        "replies": [
                                          {
                                            "x": 0,
                                            "y": 11,
                                            "color": 1,
                                            "replies": [
                                              {
                                                "x": 0,
                                                "y": 8,
                                                "color": 2,
                                                "replies": [
                                                  {
                                                    "x": 0,
                                                    "y": 7,
                                                    "color": 1,
                                                    "replies": [
                                                      {
                                                        "x": 0,
                                                        "y": 12,
                                                        "color": 2,
                                                        "replies": []
                                                      }
                                                    ]
                                                  }
                                                ]
                                              }
                                            ]
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-6-03",
    "track": "yose",
    "level": 6,
    "title": "官子谱 · 高段官子 3",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        18,
        1
      ],
      [
        17,
        1
      ],
      [
        16,
        2
      ],
      [
        16,
        3
      ],
      [
        16,
        4
      ],
      [
        15,
        3
      ],
      [
        13,
        3
      ],
      [
        14,
        3
      ],
      [
        13,
        4
      ],
      [
        12,
        2
      ],
      [
        11,
        2
      ],
      [
        10,
        1
      ],
      [
        9,
        2
      ],
      [
        15,
        5
      ],
      [
        15,
        6
      ],
      [
        14,
        6
      ],
      [
        16,
        6
      ],
      [
        16,
        8
      ],
      [
        15,
        8
      ],
      [
        15,
        9
      ],
      [
        15,
        10
      ]
    ],
    "white": [
      [
        12,
        1
      ],
      [
        13,
        2
      ],
      [
        14,
        2
      ],
      [
        15,
        2
      ],
      [
        15,
        1
      ],
      [
        16,
        1
      ],
      [
        12,
        3
      ],
      [
        12,
        4
      ],
      [
        12,
        5
      ],
      [
        13,
        5
      ],
      [
        14,
        5
      ],
      [
        14,
        4
      ],
      [
        15,
        4
      ],
      [
        12,
        7
      ],
      [
        14,
        8
      ],
      [
        14,
        9
      ],
      [
        14,
        10
      ],
      [
        15,
        11
      ],
      [
        16,
        11
      ],
      [
        16,
        10
      ],
      [
        16,
        9
      ],
      [
        17,
        12
      ],
      [
        16,
        5
      ],
      [
        17,
        2
      ]
    ],
    "moves": [
      {
        "x": 17,
        "y": 5,
        "color": 2,
        "replies": [
          {
            "x": 17,
            "y": 3,
            "color": 1,
            "replies": [
              {
                "x": 18,
                "y": 6,
                "color": 2,
                "replies": [
                  {
                    "x": 17,
                    "y": 7,
                    "color": 1,
                    "replies": [
                      {
                        "x": 18,
                        "y": 3,
                        "color": 2,
                        "replies": [
                          {
                            "x": 18,
                            "y": 2,
                            "color": 1,
                            "replies": [
                              {
                                "x": 18,
                                "y": 4,
                                "color": 2,
                                "replies": [
                                  {
                                    "x": 17,
                                    "y": 6,
                                    "color": 1,
                                    "replies": [
                                      {
                                        "x": 16,
                                        "y": 0,
                                        "color": 2,
                                        "replies": [
                                          {
                                            "x": 17,
                                            "y": 0,
                                            "color": 1,
                                            "replies": [
                                              {
                                                "x": 18,
                                                "y": 9,
                                                "color": 2,
                                                "replies": [
                                                  {
                                                    "x": 18,
                                                    "y": 7,
                                                    "color": 1,
                                                    "replies": [
                                                      {
                                                        "x": 14,
                                                        "y": 0,
                                                        "color": 2,
                                                        "replies": []
                                                      }
                                                    ]
                                                  }
                                                ]
                                              }
                                            ]
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-6-04",
    "track": "yose",
    "level": 6,
    "title": "官子谱 · 高段官子 4",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        11,
        17
      ],
      [
        12,
        17
      ],
      [
        13,
        17
      ],
      [
        13,
        16
      ],
      [
        14,
        15
      ],
      [
        14,
        14
      ],
      [
        15,
        15
      ],
      [
        16,
        15
      ],
      [
        17,
        16
      ],
      [
        18,
        15
      ]
    ],
    "white": [
      [
        17,
        15
      ],
      [
        17,
        14
      ],
      [
        16,
        14
      ],
      [
        15,
        13
      ],
      [
        14,
        13
      ],
      [
        13,
        14
      ],
      [
        13,
        15
      ],
      [
        12,
        16
      ],
      [
        11,
        16
      ],
      [
        10,
        16
      ],
      [
        10,
        17
      ],
      [
        14,
        16
      ]
    ],
    "moves": [
      {
        "x": 16,
        "y": 17,
        "color": 2,
        "replies": [
          {
            "x": 16,
            "y": 16,
            "color": 1,
            "replies": [
              {
                "x": 15,
                "y": 17,
                "color": 2,
                "replies": [
                  {
                    "x": 14,
                    "y": 17,
                    "color": 1,
                    "replies": [
                      {
                        "x": 17,
                        "y": 17,
                        "color": 2,
                        "replies": [
                          {
                            "x": 15,
                            "y": 16,
                            "color": 1,
                            "replies": [
                              {
                                "x": 18,
                                "y": 17,
                                "color": 2,
                                "replies": [
                                  {
                                    "x": 18,
                                    "y": 16,
                                    "color": 1,
                                    "replies": [
                                      {
                                        "x": 17,
                                        "y": 18,
                                        "color": 2,
                                        "replies": [
                                          {
                                            "x": 15,
                                            "y": 18,
                                            "color": 1,
                                            "replies": [
                                              {
                                                "x": 14,
                                                "y": 18,
                                                "color": 2,
                                                "replies": [
                                                  {
                                                    "x": 13,
                                                    "y": 18,
                                                    "color": 1,
                                                    "replies": [
                                                      {
                                                        "x": 18,
                                                        "y": 14,
                                                        "color": 2,
                                                        "replies": [
                                                          {
                                                            "x": 11,
                                                            "y": 18,
                                                            "color": 1,
                                                            "replies": [
                                                              {
                                                                "x": 10,
                                                                "y": 18,
                                                                "color": 2,
                                                                "replies": []
                                                              }
                                                            ]
                                                          }
                                                        ]
                                                      }
                                                    ]
                                                  }
                                                ]
                                              }
                                            ]
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-6-05",
    "track": "yose",
    "level": 6,
    "title": "官子谱 · 高段官子 5",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        16,
        15
      ],
      [
        17,
        15
      ],
      [
        15,
        16
      ],
      [
        14,
        16
      ],
      [
        13,
        16
      ]
    ],
    "white": [
      [
        15,
        15
      ],
      [
        14,
        15
      ],
      [
        13,
        15
      ],
      [
        12,
        15
      ],
      [
        11,
        16
      ],
      [
        10,
        14
      ],
      [
        15,
        13
      ],
      [
        17,
        13
      ],
      [
        16,
        16
      ]
    ],
    "moves": [
      {
        "x": 16,
        "y": 17,
        "color": 2,
        "replies": [
          {
            "x": 15,
            "y": 17,
            "color": 1,
            "replies": [
              {
                "x": 17,
                "y": 17,
                "color": 2,
                "replies": [
                  {
                    "x": 16,
                    "y": 18,
                    "color": 1,
                    "replies": [
                      {
                        "x": 17,
                        "y": 18,
                        "color": 2,
                        "replies": [
                          {
                            "x": 15,
                            "y": 18,
                            "color": 1,
                            "replies": [
                              {
                                "x": 17,
                                "y": 16,
                                "color": 2,
                                "replies": [
                                  {
                                    "x": 18,
                                    "y": 16,
                                    "color": 1,
                                    "replies": [
                                      {
                                        "x": 13,
                                        "y": 17,
                                        "color": 2,
                                        "replies": [
                                          {
                                            "x": 12,
                                            "y": 17,
                                            "color": 1,
                                            "replies": [
                                              {
                                                "x": 12,
                                                "y": 18,
                                                "color": 2,
                                                "replies": [
                                                  {
                                                    "x": 14,
                                                    "y": 17,
                                                    "color": 1,
                                                    "replies": [
                                                      {
                                                        "x": 13,
                                                        "y": 18,
                                                        "color": 2,
                                                        "replies": [
                                                          {
                                                            "x": 11,
                                                            "y": 18,
                                                            "color": 1,
                                                            "replies": [
                                                              {
                                                                "x": 12,
                                                                "y": 16,
                                                                "color": 2,
                                                                "replies": [
                                                                  {
                                                                    "x": 14,
                                                                    "y": 18,
                                                                    "color": 1,
                                                                    "replies": [
                                                                      {
                                                                        "x": 13,
                                                                        "y": 18,
                                                                        "color": 2,
                                                                        "replies": []
                                                                      }
                                                                    ]
                                                                  }
                                                                ]
                                                              }
                                                            ]
                                                          }
                                                        ]
                                                      }
                                                    ]
                                                  }
                                                ]
                                              }
                                            ]
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "yose-6-06",
    "track": "yose",
    "level": 6,
    "title": "官子谱 · 高段官子 6",
    "prompt": "白先。这是官子残局。请走出谱上的主变化。收官或死活有时还有别的正着，本题对照这一谱。",
    "source": "官子谱（公有领域；谱面转录 Flygo / u-go.net）",
    "size": 19,
    "toPlay": 2,
    "black": [
      [
        2,
        10
      ],
      [
        2,
        13
      ],
      [
        2,
        3
      ],
      [
        3,
        3
      ],
      [
        4,
        2
      ],
      [
        5,
        2
      ],
      [
        6,
        2
      ]
    ],
    "white": [
      [
        3,
        2
      ],
      [
        2,
        2
      ],
      [
        4,
        1
      ],
      [
        8,
        2
      ],
      [
        2,
        5
      ],
      [
        4,
        5
      ],
      [
        2,
        8
      ],
      [
        3,
        15
      ]
    ],
    "moves": [
      {
        "x": 1,
        "y": 3,
        "color": 2,
        "replies": [
          {
            "x": 1,
            "y": 4,
            "color": 1,
            "replies": [
              {
                "x": 2,
                "y": 4,
                "color": 2,
                "replies": [
                  {
                    "x": 1,
                    "y": 2,
                    "color": 1,
                    "replies": [
                      {
                        "x": 0,
                        "y": 3,
                        "color": 2,
                        "replies": [
                          {
                            "x": 0,
                            "y": 2,
                            "color": 1,
                            "replies": [
                              {
                                "x": 4,
                                "y": 3,
                                "color": 2,
                                "replies": [
                                  {
                                    "x": 0,
                                    "y": 4,
                                    "color": 1,
                                    "replies": [
                                      {
                                        "x": 1,
                                        "y": 3,
                                        "color": 2,
                                        "replies": [
                                          {
                                            "x": 0,
                                            "y": 3,
                                            "color": 1,
                                            "replies": [
                                              {
                                                "x": 3,
                                                "y": 4,
                                                "color": 2,
                                                "replies": [
                                                  {
                                                    "x": 1,
                                                    "y": 3,
                                                    "color": 1,
                                                    "replies": [
                                                      {
                                                        "x": 1,
                                                        "y": 1,
                                                        "color": 2,
                                                        "replies": [
                                                          {
                                                            "x": 0,
                                                            "y": 1,
                                                            "color": 1,
                                                            "replies": [
                                                              {
                                                                "x": 1,
                                                                "y": 0,
                                                                "color": 2,
                                                                "replies": [
                                                                  {
                                                                    "x": 1,
                                                                    "y": 6,
                                                                    "color": 1,
                                                                    "replies": [
                                                                      {
                                                                        "x": 1,
                                                                        "y": 5,
                                                                        "color": 2,
                                                                        "replies": [
                                                                          {
                                                                            "x": 0,
                                                                            "y": 5,
                                                                            "color": 1,
                                                                            "replies": [
                                                                              {
                                                                                "x": 1,
                                                                                "y": 7,
                                                                                "color": 2,
                                                                                "replies": []
                                                                              }
                                                                            ]
                                                                          }
                                                                        ]
                                                                      }
                                                                    ]
                                                                  }
                                                                ]
                                                              }
                                                            ]
                                                          }
                                                        ]
                                                      }
                                                    ]
                                                  }
                                                ]
                                              }
                                            ]
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
];
